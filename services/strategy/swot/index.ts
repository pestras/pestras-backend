// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { SubServiceEvents } from "@pestras/micro";
import { Collection, ObjectId } from "mongodb";
import { Swot as SW } from '@pestras/core/swot';
import { CreateSwotInput, UpdateSwotInput } from '@pestras/core/swot/crud';
import { CreateTTRInput } from '@pestras/core/swot/ttr/crud';
import { TTR } from '@pestras/core/swot/ttr';
import { store } from "../../../store";
import { HttpError, HTTP_CODES, Request, Response, ROUTE } from "@pestras/micro-router";
import { oid, oids } from "../../../util/oid";
import { ChangeLog, CHANGE_TYPE, ENTITY_TYPE } from "@pestras/core/change-log";

import './validators';
import { Kpi, KPI_CLASS } from "@pestras/core/kpi";
import { Project } from "@pestras/core/kpi/project";
import { AuthData } from "../../../auth";
import { ROLE } from "@pestras/core/user";

export class Swot implements SubServiceEvents {
  sCol: Collection<SW<ObjectId>>;
  tCol: Collection<TTR<ObjectId>>;
  kpisCol: Collection<Project<ObjectId>>;

  onReady() {
    this.sCol = store.get("db").collection(SW.ColName);
    this.tCol = store.get("db").collection(TTR.ColName);
    this.kpisCol = store.get("db").collection(Kpi.ColName);
  }

  // Read Apis
  // ==============================================================================================================

  @ROUTE({ hooks: ['auth'] })
  async getSwots(_: Request, res: Response) {
    res.json(await this.sCol.find().toArray());
  }

  @ROUTE({ path: '/many', method: 'PUT', hooks: ['auth'] })
  async getSwotsByIds(req: Request<string[]>, res: Response) {
    res.json(await this.sCol.find({ _id: { $in: oids(req.body) } }).toArray());
  }

  @ROUTE({ path: '/{swotId}', hooks: ['auth'] })
  async getSwotById(req: Request<null, { swotId: string }>, res: Response) {
    const swot = await this.sCol.findOne({ _id: oid(req.params.get("swotId")) });

    if (!swot)
      throw new HttpError(HTTP_CODES.NOT_FOUND, "swotNotFound");

    res.json(swot);
  }

  @ROUTE({ path: '/ttrs/all/{strategyId}', hooks: ['auth'] })
  async getTTRs(req: Request<null, { strategyId: string }>, res: Response) {
    res.json(await this.tCol.find({ strategy: oid(req.params.get("strategyId")) }).toArray());
  }

  @ROUTE({ path: '/ttrs/many', method: 'PUT', hooks: ['auth'] })
  async getTTRsByIds(req: Request<string[], { strategyId: string }>, res: Response) {
    res.json(await this.tCol.find({ _id: { $in: oids(req.body) }, strategy: oid(req.params.get("strategyId")) }).toArray());
  }

  @ROUTE({ path: '/ttrs/{ttrId}', hooks: ['auth'] })
  async getTTRById(req: Request<null, { ttrId: string }>, res: Response) {
    const ttr = await this.tCol.findOne({ _id: oid(req.params.get("ttrId")) });

    if (!ttr)
      throw new HttpError(HTTP_CODES.NOT_FOUND, "ttrNotFound");

    res.json(ttr);
  }

  // Write Apis
  // ==============================================================================================================

  @ROUTE({ method: 'POST', hooks: ['validate', 'auth'] })
  async createSwot(req: Request<CreateSwotInput>, res: Response) {
    if ((await this.sCol.countDocuments({ name: req.body.name })) > 0)
      throw new HttpError(HTTP_CODES.CONFLICT, 'nameAlreadyExists');

    const swot = new SW<ObjectId>({
      name: req.body.name,
      desc: req.body.desc,
      type: req.body.type,
      classifications: req.body.classifications,
      aspects: req.body.aspects,
      factors: oids(req.body.factors),
      createdBy: req.auth.user._id,
      updatedBy: req.auth.user._id
    });

    swot._id = (await this.sCol.insertOne(swot)).insertedId;

    store.get("logChanges")(new ChangeLog({
      socket: req.headers['socket'] as string,
      date: swot.createdAt,
      type: CHANGE_TYPE.INSERT,
      entityType: ENTITY_TYPE.SWOT,
      entity: swot._id,
      changedBy: req.auth.user._id
    }));

    res.json(swot);
  }

  @ROUTE({ path: '/{swotId}', method: 'PUT', hooks: ['validate', 'auth'] })
  async updateSwot(req: Request<UpdateSwotInput, { swotId: string }>, res: Response) {
    const date = new Date();
    const swot = await this.sCol.findOne({ _id: oid(req.params.get("swotId")) }, { projection: { name: 1 } });

    if (!swot)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'swotNotFound');

    if (req.body.name !== swot.name)
      if ((await this.sCol.countDocuments({ name: req.body.name })) > 0)
        throw new HttpError(HTTP_CODES.CONFLICT, 'nameAlreadyExists');

    await this.sCol.updateOne({ _id: swot._id }, {
      $set: {
        name: req.body.name,
        desc: req.body.desc,
        classifications: req.body.classifications,
        aspects: req.body.aspects,
        factors: oids(req.body.factors),
        updatedAt: date,
        updatedBy: req.auth.user._id
      }
    });

    store.get("logChanges")(new ChangeLog({
      socket: req.headers['socket'] as string,
      date,
      type: CHANGE_TYPE.UPDATE,
      entityType: ENTITY_TYPE.SWOT,
      entity: swot._id,
      changedBy: req.auth.user._id
    }));

    res.json({ updatedAt: date, updatedBy: req.auth.user._id });
  }

  @ROUTE({ path: '/{swotId}', method: 'DELETE', hooks: ['auth'] })
  async deleteSwot(req: Request<null, { swotId: string }>, res: Response) {
    const _id = oid(req.params.get("swotId"));

    if ((await this.sCol.countDocuments({ _id })) === 0)
      res.json(true);

    if ((await this.tCol.countDocuments({ swot: oid(req.params.get("swotId")) })) > 0)
      throw new HttpError(HTTP_CODES.FORBIDDEN, 'deletingSwotWithTTRSNotAllowed');

    await this.sCol.deleteOne({ _id });

    store.get("logChanges")(new ChangeLog({
      socket: req.headers['socket'] as string,
      date: new Date(),
      type: CHANGE_TYPE.DELETE,
      entityType: ENTITY_TYPE.SWOT,
      entity: _id,
      changedBy: req.auth.user._id
    }));

    res.json(true);
  }

  @ROUTE({
    path: '/ttrs',
    method: 'POST',
    hooks: ['validate', 'auth']
  })
  async createTTR(req: Request<CreateTTRInput>, res: Response) {
    const auth: AuthData = req.auth;
    const swotId = oid(req.body.swot);

    if ((await this.sCol.countDocuments({ _id: swotId })) === 0)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'swotNotFound');

    const project: Project<ObjectId> = await this.kpisCol.findOne(
      { _id: oid(req.body.project), class: { $in: [KPI_CLASS.PROJECT, KPI_CLASS.INITIATIVE] } },
      { projection: { serial: 1, strategy: 1, orgunitSerial: 1, orgunit: 1 } }
    );

    if (!project)
      throw new HttpError(HTTP_CODES.NOT_FOUND, 'projectorInitiativeNotFound');

    // if user is not super check orgunit serial
    if (auth.user.role >= ROLE.AUTHOR && project.orgunitSerial.indexOf(auth.user.orgunitSerial) !== 0)
      throw new HttpError(HTTP_CODES.UNAUTHORIZED, 'unauthorized');
  }
}