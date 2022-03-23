// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { LOGLEVEL, Micro, MICRO_STATUS, SERVICE, ServiceEvents } from "@pestras/micro";
import { HttpError, HTTP_CODES, MicroRouter, Request, Response } from "@pestras/micro-router";
import { MongoClient } from "mongodb";
import { store } from "./store";
import { Validall } from '@pestras/validall';
import { Auth } from "./auth";

// evironment variables
const PROD = process.env.NODE_ENV === 'production';
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  Micro.logger.error(new Error('mongo conncetion string was not provided'));
  process.exit(0);
}

Micro.plugins(
  new MicroRouter({ version: "1" })
);

@SERVICE({ logLevel: PROD ? LOGLEVEL.INFO : LOGLEVEL.DEBUG })
export class APIs implements ServiceEvents {
  mongoClient: MongoClient;

  private async connectDb() {
    try {
      Micro.logger.info('connecting to database');
      this.mongoClient = await MongoClient.connect(MONGO_URL);

      this.mongoClient.once("close", () => {
        if (Micro.status === MICRO_STATUS.LIVE) {
          Micro.logger.warn('disconnected from database');
          setTimeout(() => this.connectDb(), 1000, 5);
        }
      });

      store.set("db", this.mongoClient.db());

    } catch (e: any) {
      Micro.logger.error(e);
      Micro.logger.info('retry connecting after 10 sec...');
      setTimeout(() => this.connectDb(), 1000 * 5);
    }
  }

  async onInit() {
    await this.connectDb();
  }

  onExit() {
    if (this.mongoClient) {
      Micro.logger.warn("Closing DB connection")
      this.mongoClient.close(true, () => Micro.logger.info('DB Connection closed'));
    }
  }

  async auth(req: Request, _: Response, handlerName: string) {
    let authorization = req.headers['authorization'] as string;
    let token = authorization ? authorization.split(' ')[1] : null;

    if (!token)
      throw new HttpError(HTTP_CODES.TOKEN_REQUIRED, 'tokenRequired');

    req.auth = await store.get("authenticate")({ token, service: 'api.auth', route: handlerName });
  }

  async validateBody(req: Request, _: Response, handlerName: string) {
    const validator = Validall.Get(handlerName);

    if (!validator) {
      Micro.logger.error(new Error(`validator '${handlerName}' is undefined`));
      throw new HttpError(HTTP_CODES.UNKNOWN_ERROR, 'unknownError');
    }

    if (!validator.validate(req.body))
      throw new HttpError(HTTP_CODES.BAD_REQUEST, validator.error.message);
  }
}

Micro.start(APIs, [Auth]);