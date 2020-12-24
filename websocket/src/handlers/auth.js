const jose = require("node-jose");
const fetch = require("node-fetch");
const KEYS_URL = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`;

module.exports.authFunc = async (event, context, callback) => {
    const {
      queryStringParameters: { NBU },
      methodArn,
    } = event;
  
    let policy;
  console.log('here1');
    try {
      policy = await authCognitoToken(NBU, methodArn);
      console.log('SUCCESS: ' + JSON.stringify(policy));
      callback(null, policy);
    } catch (error) {
      console.log(error);
      callback("Signature verification failed");
    }
  };
  
  const authCognitoToken = async (token, methodArn) => {
    if (!token) throw new Error("Unauthorized");
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
        callback("Public key not found in jwks.json");
      }
  
      const jwkRes = await jose.JWK.asKey(foundKey);
      const verifyRes = await jose.JWS.createVerify(jwkRes).verify(token);
      const claims = JSON.parse(verifyRes.payload);


      const current_ts = Math.floor(new Date() / 1000);
      if (current_ts > claims.exp) {
        throw new Error("Token is expired");
      }
  
      if (claims.aud != app_client_id) {
        throw new Error("Token was not issued for this audience");
      } else {
        var policy = generatePolicy("me", "Allow", methodArn);
        policy.context = claims;
        return policy;
      }
    }
    throw new Error("Keys url is invalid");
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