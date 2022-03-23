// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { TOKEN_TYPE, TokenData,  } from "@pestras/core/user/auth";
import { sign, verify } from 'jsonwebtoken';

interface TokenPayLoad {
  id: string;
  type?: TOKEN_TYPE;
  payload?: any;
  expiration?: number;
}

const TOKEN_SECRET = process.env.TOKEN_SECRET;

const tokenExpiration = [
  1000 * 60 * 60 * 24 * 30,
  1000 * 60 * 60 * 24,
  1000 * 60 * 60 * 24 * 30
];

export function signToken(data: Partial<TokenData>) {
  let id = data.id;
  let type = data.type || TOKEN_TYPE.DEFAULT;
  let expiration = tokenExpiration[type] + Date.now();
  let expirationDate = Date.now() + expiration;

  return sign({ id, type, expirationDate, payload: data.payload }, TOKEN_SECRET);
}

export function verifyToken(token: string) {
  const tokenData = <TokenPayLoad>verify(token, TOKEN_SECRET);

  if (!tokenData || !tokenData.id)
    throw 'invalidToken';

  if (tokenData.expiration && Date.now() > tokenData.expiration)
    throw 'outdatedToken';

  return tokenData;
}