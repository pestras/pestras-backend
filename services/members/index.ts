// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { ROLE, User } from "@pestras/core/user";
import { Orgunit } from "@pestras/core/orgunit";
import { CreateMemberInput, UpdateProfileInput } from "@pestras/core/user/crud";
import { SubServiceEvents } from "@pestras/micro";
import { HttpError, HTTP_CODES, Request, Response, ROUTE } from "@pestras/micro-router";
import { Collection, Filter, ObjectId } from "mongodb";
import { store } from "../../store";
import { AuthData } from "../../auth";
import { oid, oids } from "../../util/oid";
import { MailType } from "../emails/mail.conf";
import { signToken } from "../../util/token";
import { TOKEN_TYPE } from "@pestras/core/user/auth";
import './validators';

export class Memeber implements SubServiceEvents {
  col: Collection<User<ObjectId>>;
  orgsCol: Collection<Orgunit<ObjectId>>;

  onReady() {
    this.col = store.get("db").collection(User.ColName);
  }

  @ROUTE({ hooks: ['auth'] })
  async getAllUsers(req: Request, res: Response) {
    res.json(await this.col.find({ role: { $gt: req.auth.user.role } }, { projection: { salt: 0, password: 0} }).toArray());
  }

  @ROUTE({
    path: '/many',
    method: 'PUT',
    hooks: ['auth']
  })
  async getUsersByIds(req: Request<string[]>, res: Response) {
    const ids = oids(req.body);

    res.json(await this.col.find(
      { _id: { $in: ids }, role: { $gt: req.auth.user.role } },
      { projection: { password: 0, salt: 0 }}
    ).toArray());
  }

  @ROUTE({
    path: '/{userId}',
    hooks: ['auth']
  })
  async getUserById(req: Request<null, { userId: string }>, res: Response) {
    const auth: AuthData = req.auth;
    const query: Filter<User<ObjectId>> = { _id: oid(req.params.get("userId")) };

    if (req.params.get("userId") !== auth.user._id.toHexString())
      if (auth.user.role <= 1)
        query.role = { $gt: auth.user.role };
      else 
        throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'unauthorized');

    const user = await this.col.findOne(query, { projection: { password: 0, salt: 0 } });

    if (!user)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'userNotFound');

    res.json(user);
  }

  @ROUTE({
    path: '/',
    method: 'POST',
    hooks: ['validate', 'auth']
  })
  async createMember(req: Request<CreateMemberInput>, res: Response) {
    const auth: AuthData = req.auth;
    let orgunit: Orgunit<ObjectId>

    if ((await this.col.countDocuments({ $or: [ { email: req.body.email }, { emailToActivate: req.body.email }] })) > 0)
      throw new HttpError(HTTP_CODES.CONFLICT, 'emailAlreadyExists');

    if (auth.user.role >= req.body.role)
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'unauthorizedRole');

    if (req.body.role > ROLE.SUPERVIEWER)
      orgunit = await this.orgsCol.findOne({ _id: oid(req.body.orgunit) }, { projection: { serial: 1 } });
    
    const user = new User<ObjectId>({
      orgunit: !!orgunit ? oid(req.body.orgunit) : null,
      orgunitSerial: !!orgunit ? orgunit.serial : '',
      role: req.body.role,
      profile: req.body.profile,
      email: null,
      emailToActivate: req.body.email,
      password: null,
      salt: null,
      active: true,
      createdBy: auth.user._id,
      updatedBy: auth.user._id
    });

    user._id = (await this.col.insertOne(user)).insertedId;

    delete user.password,
    delete user.salt;

    store.get("sendMail")(
      MailType.NEW_MEMBER,
      user.emailToActivate,
      signToken({ id: user._id.toHexString(), type: TOKEN_TYPE.RESET }),
      user
    );

    // TODO: emit change

    res.json(user);
  }

  @ROUTE({
    path: '/',
    method: 'PUT',
    hooks: ['validate', 'auth']
  })
  async updateProfile(req: Request<UpdateProfileInput>, res: Response) {
    await this.col.updateOne({ _id: req.auth.user._id }, { $set: {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.auth.user._id
    }});

    // TODO: emit change

    res.json(true);
  }

  @ROUTE({
    path: '/{userId}',
    method: 'DELETE',
    hooks: ['auth']
  })
  async deleteMember(req: Request<null, { userId: string }>, res: Response) {
    await this.col.updateOne({ _id: oid(req.params.get("userId")) }, { $set: {
      active: false,
      updatedAt: new Date(),
      updatedBy: req.auth.user._id
    }});

    // TODO: emit change

    res.json(true);
  }
}