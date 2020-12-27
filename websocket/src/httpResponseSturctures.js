


/*--4XX Errors--**/
const BadRequest = {statusCode: 400, type: "http://noggleboggle.com/ws/bad-request", title: "400 Bad Request"};
const Unauthorized = {statusCode: 401, type: "http://noggleboggle.com/ws/unauthorized", title: "401 Unauthorized"};
// export var internalServerError = {};


/*--5XX Errors--**/
const InternalServerError = {statusCode: 500, type: "http://noggleboggle.com/ws/internal-server-error", title: "500 Internal Server Error"};

module.exports.BadRequest = BadRequest,
module.exports.Unauthorized = Unauthorized;
module.exports.InternalServerError = InternalServerError;
