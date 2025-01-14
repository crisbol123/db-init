const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');
const axios = require('axios');
exports.handler = async (event, context, callback) => {
  console.log("Evento recibido: ", JSON.stringify(event));

  const secretsmanager = new AWS.SecretsManager();
  const userSecretArn = process.env.USER_SECRET_ARN;
  const rdsSecretArn =  process.env.RDS_SECRET_ARN;
  const rdsURL =  process.env.DATABASE_URL;
  const responseBody = {
    Status: "SUCCESS",
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
};
  try {
    // Obtener las credenciales del Secret Manager
    console.log("Inicio  Obtener Credenciales: ", rdsSecretArn, " ",userSecretArn);
    const rdsSecret = await secretsmanager.getSecretValue({ SecretId: rdsSecretArn }).promise();
    const userSecret = await secretsmanager.getSecretValue({ SecretId: userSecretArn }).promise();
    console.log("FIN  Obtener Credenciales: ", rdsSecret, " ",userSecret);
    const rdsCredentials = JSON.parse(rdsSecret.SecretString);
    console.log("INICIO CONECTAR CON AWS ",rdsURL , rdsCredentials) ;
    const connection = await mysql.createConnection({
      host: rdsURL,
      port: 3306,
      user: 'root',
      password: 'Julian1234'
    });

    console.log("Conectado a la base de datos");

    // Crear la base de datos y el usuario
    const createDbQuery = `CREATE DATABASE moneywise;`;

    await connection.query(createDbQuery);
    console.log("Base de datos 'foods' creada.");
    await connection.end();
    
    console.log("Conexión a la base de datos cerrada.");
    await axios.put(event.ResponseURL, responseBody);
    context.succeed("Lambda ejecutada con éxito");
    callback(undefined,"Lambda ejecutada con éxito");
    return {
      statusCode: 200,
      body: JSON.stringify('Success!')
    };

  } catch (error) {
    responseBody.Status= "FAILED";
    responseBody.Reason = error.message;
    await axios.put(event.ResponseURL, responseBody);
    console.error("Error en la función Lambda: ", error);
    callback("Error al ejecutar la Lambda: " + error.message);
    context.succeed("Error al ejecutar la Lambda: " + error.message);
    return {
        statusCode: 500,
        body: JSON.stringify('Success!')
      };
  }
};