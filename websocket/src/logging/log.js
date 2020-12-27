const warning = (fileName, functionName, locationName, data) => {
    console.warn("WARNING LOG FROM  " + (fileName ? fileName: "Unknown File") + "-" +  (functionName ? functionName: "Unknown Function") + "-" + (locationName ? locationName: "")+": " + data);

}


const error = (fileName, functionName, locationName, data) => {
    console.error("ERROR LOG FROM  " + (fileName ? fileName: "Unknown File") + "-" +  (functionName ? functionName: "Unknown Function") + "-" + (locationName ? locationName: "")+": " + data);

}

const informational = (fileName, functionName, locationName, data) => {
    console.info("INFORMATIONAL LOG FROM  " + (fileName ? fileName: "Unknown File") + "-" +  (functionName ? functionName: "Unknown Function") + "-" + (locationName ? locationName: "")+": " + data);
}

module.exports.warning = warning;
module.exports.error = error;
module.exports.informational = informational;