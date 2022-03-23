// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { User } from "@pestras/core/user";
import { TOKEN_TYPE } from "@pestras/core/user/auth";
import { ChangeEmailInput, ChangeMemberEmailInput, ResendActivationEmailInput } from "@pestras/core/user/crud";
import { Micro, STORE, SubServiceEvents } from "@pestras/micro";
import sendGridMail from '@sendgrid/mail';
import { HttpError, HTTP_CODES, Request, Response, ROUTE } from "@pestras/micro-router";
import { Collection, ObjectId } from "mongodb";
import { store } from "../../store";
import { getDashboardLink, getMail, MailType } from "./mail.conf";
import { AuthData } from "../../auth";
import { signToken } from "../../util/token";
import { verify } from "../../util/hash";
import './validators';

const SG_API_KEY = process.env.SG_API_KEY;

export class Emails implements SubServiceEvents {
  usersCol: Collection<User<ObjectId>>;

  onInit() {
    sendGridMail.setApiKey(SG_API_KEY.replace(/\r?\n|\r/g, ""));
  };

  onReady() {
    this.usersCol = store.get("db").collection(User.ColName);
  }

  @STORE(store)
  async sendMail(type: MailType, to: string, token: string, user: User<any>) {
    const conf = getMail(type, to, { link: `${getDashboardLink(type)}?t=${token}`, user });
    const info = await sendGridMail.send(conf);
    Micro.logger.info(`${type} mail sent with status: ${info[0].statusCode}`);
  }

  @ROUTE({
    path: '/',
    method: 'PUT',
    hooks: ['validate', 'auth']
  })
  async changeEmail(req: Request<ChangeEmailInput>, res: Response) {
    const auth: AuthData = req.auth;

    if ((await this.usersCol.countDocuments({ $or: [{ email: req.body.email }, { emailToActivate: req.body.email }] })) > 0)
      throw new HttpError(HTTP_CODES.CONFLICT, 'emailAlreadyExists');

    await this.usersCol.updateOne({ _id: new ObjectId(auth.user._id) }, {
      $set: { emailToActivate: req.body.email, updatedAt: new Date(), updatedBy: auth.user._id }
    });

    store.get("sendMail")(
      MailType.VERIFY_EMAIL,
      auth.user.emailToActivate,
      signToken({ id: auth.user._id.toHexString(), type: TOKEN_TYPE.ACTIVATION }),
      auth.user
    );

    res.json(true);
  }

  @ROUTE({
    path: '/{userId}',
    method: 'PUT',
    hooks: ['validate', 'auth']
  })
  async changeMemberEmail(req: Request<ChangeMemberEmailInput, { userId: string }>, res: Response) {
    const auth: AuthData = req.auth;
    let userId: ObjectId;

    try { userId = new ObjectId(req.params.get("userId")); }
    catch (e) { throw new HttpError(HTTP_CODES.BAD_REQUEST, 'invalidUserId'); }

    // find user
    const user = await this.usersCol.findOne({ _id: userId }, { projection: { email: 1, emailToActivate: 1, role: 1, profile: 1 } });

    // check if requestar can change the user role
    if (auth.user.role >= user.role)
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'unAuthorized');

    // if user already has activated email cancel request
    if (!!user.email)
      throw new HttpError(HTTP_CODES.FORBIDDEN, 'changeEmailNotAllowed');

    // if email is same as the current end request
    if (user.emailToActivate === req.body.email)
      res.json(true);

    // make sure email not exists
    if ((await this.usersCol.countDocuments({ $or: [{ email: req.body.email }, { emailToActivate: req.body.email }] })) > 0)
      throw new HttpError(HTTP_CODES.CONFLICT, 'emailAlreadyExists');

    // update user emailToChange property
    await this.usersCol.updateOne({ _id: userId }, { $set: { emailToActivate: req.body.email, updatedAt: new Date(), updatedBy: new ObjectId(auth.user._id) } });

    // rend verification email
    store.get("sendMail")(
      MailType.VERIFY_EMAIL,
      user.emailToActivate,
      signToken({ id: user._id.toHexString(), type: TOKEN_TYPE.ACTIVATION }),
      user
    );

    // respond
    res.json(true);
  }

  @ROUTE({
    path: '/resend-verification-email',
    method: 'POST',
    hooks: ['validate']
  })
  async resendVerificationEmail(req: Request<ResendActivationEmailInput>, res: Response) {
    const email = req.body.email;
    const user = await this.usersCol.findOne({ emailToActivate: email }, { projection: { emailToActivate: 1, password: 1, salt: 1, profile: 1 } });

    if (!user) throw new HttpError(HTTP_CODES.NOT_FOUND, 'userNotFound');
    if (!user.emailToActivate) throw new HttpError(HTTP_CODES.NOT_FOUND, 'emailNotFound');
    if (!(verify(req.body.password, user.password, user.salt))) throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'wrongPassword');

    delete user.password;
    delete user.salt;

    // rend verification email
    store.get("sendMail")(
      MailType.VERIFY_EMAIL,
      user.emailToActivate,
      signToken({ id: user._id.toHexString(), type: TOKEN_TYPE.ACTIVATION }),
      user
    );

    res.json(true);
  }

  /** Activate Email Api */
  @ROUTE({
    path: '/verify-email',
    method: 'PUT',
    hooks: ['auth']
  })
  async verifyEmail(req: Request, res: Response) {
    const auth: AuthData = req.auth;
    const emailToActivate: string = auth.tokenData.payload.email;

    if (!emailToActivate || auth.user.emailToActivate !== emailToActivate)
      throw new HttpError(HTTP_CODES.INVALID_TOKEN, 'invalidToken');

    await this.usersCol.updateOne(
      { _id: auth.user._id },
      { $set: { email: emailToActivate, emailToActivate: null, updatedAt: new Date(), updatedBy: auth.user._id } }
    );

    res.json(true);
  }
}