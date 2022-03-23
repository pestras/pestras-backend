// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { ChangeLog } from "@pestras/core/change-log";
import { User } from "@pestras/core/user";
import { AuthInput } from "@pestras/core/user/auth";
import { Store } from "@pestras/micro";
import { Db, ObjectId } from "mongodb";
import { MailType } from "./services/emails/mail.conf";
import { AuthData } from "./auth";

export interface MicroStore {
  // props
  db: Db,
  // methods
  authenticate: (data: AuthInput) => Promise<AuthData>;
  sendMail: (type: MailType, to: string, token: string, user: User<any>) => Promise<void>;
  logChanges: (...changes: ChangeLog<ObjectId>[]) => Promise<void>;
}

export const store = new Store<MicroStore>();