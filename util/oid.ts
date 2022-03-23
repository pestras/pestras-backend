// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { HttpError, HTTP_CODES } from "@pestras/micro-router";
import { ObjectId } from "mongodb";

export function oid(id?: string | ObjectId) {
  try {
    return new ObjectId(id);    
  } catch (error) {
    throw new HttpError(HTTP_CODES.BAD_REQUEST, 'invalidDocId')
  }
}

export function oids(ids?: (string | ObjectId)[]) {
  try {
    return ids.map(id => new ObjectId(id));    
  } catch (error) {
    throw new HttpError(HTTP_CODES.BAD_REQUEST, 'invalidDocId')
  }
}