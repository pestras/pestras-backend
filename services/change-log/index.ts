// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { STORE, SubServiceEvents } from "@pestras/micro";
import { Collection, ObjectId } from "mongodb";
import { ChangeLog as CL} from '@pestras/core/change-log';
import { store } from "../../store";
import { HttpError, HTTP_CODES, Request, Response, ROUTE } from "@pestras/micro-router";
import { AuthData } from "../../auth";
import { oid } from "../../util/oid";

export class ChangeLog implements SubServiceEvents {
  cols: Collection<CL<ObjectId>>[];

  onReady() {
    this.cols = CL.ColsNames.map(name => store.get("db").collection(name));
  }

  @STORE(store)
  async logChanges(...changes: CL<ObjectId>[]) {
    for await (const change of changes)
      this.cols[change.entityType].insertOne(change);
  }

  @ROUTE({
    path: '/{type:^[0-9]{1,2}$}/{date}/{strategy}?',
    hooks: ['auth']
  })
  async getLogs(req: Request<null, { type: string, date: string, strategy: string }>, res: Response) {
    if (isNaN(Date.parse(req.params.get('date'))))
      throw new HttpError(HTTP_CODES.BAD_REQUEST, 'invalidDate');

    if (+req.params.get('type') > CL.ColsNames.length)
      throw new HttpError(HTTP_CODES.BAD_REQUEST, "invalidDataType");

    res.json(await this.cols[+req.params.get('type')].find({
      date: { $gt: new Date(req.params.get('date')) },
      strategy: !req.params.get('strategy') ? oid(req.params.get('strategy')) : null
    }).toArray());
  }
}