// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { User } from "@pestras/core/user";
import { AuthInput, ServiceAuth, TokenData } from "@pestras/core/user/auth";
import { STORE, SubServiceEvents } from "@pestras/micro";
import { HttpError, HTTP_CODES } from "@pestras/micro-router";
import { Collection, ObjectId } from "mongodb";
import { store } from "./store";
import { oid } from "./util/oid";
import { signToken, verifyToken } from "./util/token";

export interface AuthData {
  token: string;
  tokenData: TokenData,
  user: User<ObjectId>;
}

export class Auth implements SubServiceEvents {
  servicesCol: Collection<ServiceAuth>;
  usersCol: Collection<User<ObjectId>>;

  onReady() {
    this.servicesCol = store.get("db").collection(ServiceAuth.ColName);
    this.usersCol = store.get("db").collection(User.ColName);
  }
  
  async authorizeService(service: string, route: string) {
    return await this.servicesCol.findOne({ service, route });
  }

  @STORE(store)
  async authenticate(data: AuthInput): Promise<AuthData> {
    if (!data.token) throw new HttpError(HTTP_CODES.TOKEN_REQUIRED, "tokenRequired");

    const tokenData = verifyToken(data.token);
    const serviceAuth = await this.servicesCol.findOne({ service: data.service, route: data.route });
    
    if (!serviceAuth) throw new HttpError(HTTP_CODES.FORBIDDEN, "serviceNotFound");
    if (serviceAuth.tokenType !== tokenData.type) throw new HttpError(HTTP_CODES.UNAUTHORIZED, "tokenTypeMismatch");    

    const user = await this.usersCol.findOne({ _id: oid(tokenData.id) }, { projection: { password: 0, salt: 0 } });

    if (!user) 
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, "outdatedToken");

    if (!user.active)
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, "userInActive");

    if (!user.emailActivated && data.route !== "activateEmail") 
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, "userEmailInActive");

    if (serviceAuth.roles?.length > 0 && !serviceAuth.roles.includes(user.role)) 
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, "unauthorized");

    return <any>{ tokenData, token: signToken({ id: user._id.toHexString() }), user };
  }
}