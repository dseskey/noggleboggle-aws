const jose = require("node-jose");
const fetch = require("node-fetch");
require('dotenv').config()
const KEYS_URL = 'https://cognito-idp.'+process.env.AWS_REGION+'.amazonaws.com/'+process.env.USER_POOL_ID+'/.well-known/jwks.json';
const clientIds = process.env.CLIENT_IDS;
const {informational, error, warning}  = require('../logging/log');
const {Unauthorized, BadRequest, InternalServerError} = require('../httpResponseSturctures');

module.exports.authorization = async (event, context, callback) => {
  if(!event.queryStringParameters){
    let badRequestResponse = BadRequest;
    badRequestResponse.message = "Missing token";
    callback(null,badRequestResponse);
  }
    const {
      queryStringParameters: { NBU },
      methodArn,
    } = event;
  
    let policy;
    try {
      policy = await authCognitoToken(NBU, methodArn, callback);
      informational("Authorization","Success","try_1","Successful authorization of " + policy.context.email);
      callback(null, policy);
    } catch (error) {
      callback(error);
    }
  };
  
  const authCognitoToken = async (token, methodArn,callback) => {
    if (!token){
      let badRequestResponse = badRequest;
      badRequestResponse.message = "Missing token";
      throw new Error(badRequest);
    } 
    const app_client_id = process.env.APP_CLIENT_ID;
    const sections = token.split(".");
    let authHeader = jose.util.base64url.decode(sections[0]);
    authHeader = JSON.parse(authHeader);
    const kid = authHeader.kid;

    const rawRes = await fetch(KEYS_URL);
    const response = await rawRes.json();
    if (rawRes.ok) {
      const keys = response["keys"];
      let key_index = -1;
      keys.some((key, index) => {
        if (kid == key.kid) {
          key_index = index;
        }
      });
      const foundKey = keys.find((key) => {
        return kid === key.kid;
      });
  
      if (!foundKey) {
        let internalServerErrorRequest = InternalServerError;
        internalServerErrorRequest.message = "Failed to process token with key.";
        error("auth","authCognitoToken","key_retrieval"," Public key not found in jwks.json for Cognito User Pool.");
        throw new Error(internalServerErrorRequest);
      }
  
      const jwkRes = await jose.JWK.asKey(foundKey);
      const verifyRes = await jose.JWS.createVerify(jwkRes).verify(token);
      const claims = JSON.parse(verifyRes.payload);


      const current_ts = Math.floor(new Date() / 1000);
      if (current_ts > claims.exp) {
        let unauthorizedResponse = Unauthorized;
        unauthorizedResponse.message = "Token has expired.";
        error("auth","authCognitoToken","token_active_check","The token has expired for token " + token);
        return ({success: false, response: unauthorizedResponse});
      }
  
      //USE ENV PARAMETER 
      if (!clientIds.includes(claims.aud)) {
        let incorrectClientResponse = Unauthorized;
        incorrectClientResponse.message = "Token was not issued for this application.";
        error("auth","authCognitoToken","token-correct-audience","The token " + token + 
        " was not issued by a valid client ID. It was ussed by: " + claims.aud);
        throw new Error(incorrectClientResponse);
      } else {
        var policy = generatePolicy("me", "Allow", methodArn);
        policy.context = claims;
        return policy;
      }
    }
    let invaliidKeyURLError = InternalServerError;
    invaliidKeyURLError.message = "Failed to process token, could not validate with the identity store."
    throw new Error((invaliidKeyURLError));
  };

  const generatePolicy = function (principalId, effect, resource) {
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
      var policyDocument = {};
      policyDocument.Version = "2012-10-17";
      policyDocument.Statement = [];
      var statementOne = {};
      statementOne.Action = "execute-api:Invoke";
      statementOne.Effect = effect;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
    }
    return authResponse;
  };
  
  const generateAllow = function (principalId, resource) {
    return generatePolicy(principalId, "Allow", resource);
  };
  
  const generateDeny = function (principalId, resource) {
    return generatePolicy(principalId, "Deny", resource);
  };