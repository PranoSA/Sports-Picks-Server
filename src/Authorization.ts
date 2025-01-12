import dotenv from 'dotenv';
//load .env file
dotenv.config();

import jwt from 'jsonwebtoken';

import { verify as jwt_verify, Jwt, JwtHeader, JwtPayload } from 'jsonwebtoken';

import { Request, Response, NextFunction } from 'express';

import jwksClient, { JwksClient } from 'jwks-rsa';

const issuer = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`;

//allowed issuers
const allowedIssuers = [
  `${issuer}`,
  'https://auth.compressibleflowcalculator.com/realms/sports-picks',
];
const audience = process.env.KEYCLOAK_CLIENT_ID;

const jwt_options: jwt.VerifyOptions = {
  algorithms: ['RS256'],
  audience: 'account', //azp is gis-images-client
  issuer: allowedIssuers,
  complete: true,
  //add leeway to the expiration time of 2 hours
  clockTolerance: 7200,
};

let client: JwksClient | null = null;

let keyReady: Promise<void>;

async function fetchJwksUri(issuer: string): Promise<string> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  const { jwks_uri } = await response.json();
  return jwks_uri;
}

async function initializeClient(issuer: string): Promise<void> {
  const jwksUri = await fetchJwksUri(issuer);
  client = jwksClient({
    jwksUri: jwksUri,
  });
}

keyReady = initializeClient(issuer);

function getKey(
  header: jwt.JwtHeader,
  callback: ((arg0: null, arg1: any) => void) | undefined
) {
  if (!header.kid) {
    throw new Error('JWT header does not contain kid');
  }

  keyReady
    .then(() => {
      if (!client) {
        throw new Error('JWKS client is not initialized');
      }

      client.getSigningKey(header.kid, function (err, key) {
        if (err) {
          console.log('err', err);
          throw err;
        }

        if (!key) {
          throw new Error('Failed to get signing key');
        }
        // console.log('sss');
        const signingKey = key.getPublicKey();
        //console.log('signingKey', signingKey);
        if (callback) {
          callback(null, signingKey);
        }
      });
    })
    .catch((err) => {
      throw new Error(`Failed to initialize JWKS client: ${err.message}`);
    });
}

const decodeToken = (token: string) => {
  const decoded = jwt.decode(token, { complete: true });

  return decoded;
};

const verify = async (token: string): Promise<Jwt> => {
  const decoded = decodeToken(token);
  if (!decoded) {
    throw new Error('Failed to decode token');
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, jwt_options, (err, decoded) => {
      if (err) {
        return reject(err);
      }

      resolve(decoded as Jwt);
    });
  });
};

const printJwksUri = async (issuer: string) => {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  const { jwks_uri } = await response.json();
  console.log(jwks_uri);
};

printJwksUri(issuer);

//error function using ExpressRequest and ExpressResponse

//express auth middleware
/*const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearer_header = req.headers.get('Authorization');

  const bearer = bearer_header?.split(' ');

  // throw 401 if no token
  if (!bearer) {
    //set express response status to 401
    res.status();

    return;
  }
};*/

export { verify };
