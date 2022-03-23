// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { SubServiceEvents } from "@pestras/micro";
import { HttpError, HTTP_CODES, Request, Response, ROUTE } from "@pestras/micro-router";
import { Collection, ObjectId } from "mongodb";
import { store } from "../../store";

import { User } from "@pestras/core/user";
import { ChangePasswordInput, ForgotPasswordInput, LoginInput, ResetPasswordInput } from "@pestras/core/user/crud";
import { hash, verify } from "../../util/hash";
import { signToken } from "../../util/token";
import { MailType } from "../emails/mail.conf";
import { TOKEN_TYPE } from "@pestras/core/user/auth";
import { AuthData } from "../../auth";

import './validators';

export class Session implements SubServiceEvents {
  private usersCol: Collection<User<ObjectId>>;

  onReady() {
    this.usersCol = store.get('db').collection(User.ColName);
  }

  @ROUTE({
    path: 'login',
    method: 'POST',
    hooks: ['validateBody']
  })
  async login(req: Request<LoginInput>, res: Response) {
    const userData = await this.usersCol.findOne(
      { $or: [{ email: req.body.email }, { emailToActivate: req.body.email }] }
    );

    if (!userData)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'wrongEmailorPassword');

    if (userData.active === false)
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'inActiveMember');

    const user = new User<ObjectId>(userData);

    if (req.body.email === user.emailToActivate)
      throw new HttpError(HTTP_CODES.FORBIDDEN, 'emailNotActivated');

    if (!verify(req.body.password, user.password, user.salt))
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'wrongEmailorPassword');

    const token = signToken({ id: user._id.toHexString() });

    delete user.password;
    delete user.salt;

    res.json({ token, ...user });
  }

  @ROUTE({
    path: '/verify-auth',
    hooks: ['auth']
  })
  async verifyAuth(req: Request, res: Response) {
    const auth = req.auth;
    delete auth.tokenData;
    res.json(auth);
  }

  @ROUTE({
    path: '/forgot-password',
    method: 'POST',
    hooks: ['validate']
  })
  async forgotPassword(req: Request<ForgotPasswordInput>, res: Response) {
    const user = await this.usersCol.findOne(
      { $or: [{ email: req.body.email }, { emailToActivate: req.body.email }] },
      { projection: { email: 1, emailToActivate: 1, profile: 1 } }
    );

    if (!user)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'userNotFound' );

    const token = signToken({ id: user._id.toHexString(), type: TOKEN_TYPE.RESET });

    await store.get("sendMail")(MailType.RESET_PASS, user.email || user.emailToActivate, token, user);

    res.json(true);
  }

  @ROUTE({
    path: '/reset-password',
    method: 'PUT',
    hooks: ['validate', 'auth']
  })
  async resetPassword(req: Request<ResetPasswordInput>, res: Response) {
    const auth: AuthData = req.auth;

    // hash password
    const [hashed, salt] = await hash(req.body.password);

    await this.usersCol.updateOne(
      { _id: auth.user._id },
      { $set: { password: hashed, salt, updatedAt: new Date() } }
    );

    res.json(true);
  }

  @ROUTE({
    path: '/change-password',
    method: 'POST',
    hooks: ['validate', 'auth']
  })
  async changePassword(req: Request<ChangePasswordInput>, res: Response) {
    const auth: AuthData = req.auth;

    const { password: currPassword, salt: currSalt } = await this.usersCol.findOne(
      { _id: auth.user._id },
      { projection: { password: 1, salt: 1 } }
    );

    if (!(await verify(req.body.oldPassword, currPassword, currSalt)))
      return res.status(HTTP_CODES.BAD_REQUEST).json({ msg: 'incorrectPassword' });

    const [password, salt] = await hash(req.body.newPassword);

    await this.usersCol.updateOne({ _id: auth.user._id }, { $set: { password, salt, updatedAt: new Date(), updatedBy: auth.user._id }});

    res.json(true);
  }
}