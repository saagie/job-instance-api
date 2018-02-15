'use strict';

const express = require('express');
const request = require('request');

// Configure server port and host
const PORT = 8080;
const HOST = '0.0.0.0';

// Get username and password from environment variables
const adress_manager = process.env.SAAGIE_JOBINSTANCE_API_MANAGER_ADRESS;
const username = process.env.SAAGIE_JOBINSTANCE_API_LOGIN;
const password = process.env.SAAGIE_JOBINSTANCE_API_PASSWORD;
if (adress_manager==null || username==null || password==null )
{
  console.log("the variables are not defined, adress_manager, username, password");
  return 1;
}

// App
const app = express();

app.get('/api/plateform/:plateformId/job/:jobId', (req, mainResponse) => {

  var jobId = req.params.jobId;
  var plateformId = req.params.plateformId;

  //console.log("Plateform id " + plateformId);
  //console.log("Running job " + jobId);

  if(jobId == null || plateformId == null) {
    mainResponse.send('{ message: Error, the variables are not defined jobId, plateformId}');
  } else {
    // Check if the job is not already running
    request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId, { json: true }, (err, res, body) => {

      if (err) {
        console.log(err);
        mainResponse.send('{ message: An error occured. Please retry later or contact your administrator.}');
      }

      if(res.statusCode != 200) {
        console.log("An request error occured. The status code is different of 200");
      } else {

        var now = new Date();
        var today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        //console.log("today as GMT is :" + today + " = " + today.getTime());

        var lastexecutionStarttime = new Date(body.last_instance.startDateTime);
        //console.log("last instance = " + body.last_instance.startDateTime + " = " + lastexecutionStarttime.getTime());

        var status = body.last_instance.status;

        if(status!='PENDING' && status!='QUEUED') {
          // Run the job
          request.post({
              url: 'https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId + '/run',
              body: ""
             }, function(err, res, body){
               if (err) {
                 console.log(err);
                 mainResponse.send('{ message:Unable to run the job ' + jobId + '. Please retry later or contact your administrator.}');
               }

               if(res.statusCode != 204) {
                 console.log("An request error occured. The status code is different of 204 : " + res.statusCode);
                 mainResponse.send('{ message: An request error occured. The status code is different of 204 : ' + res.statusCode + ' }');
               } else {
                  // TODO: faire le while

                  const interval = setInterval(() => {
                    request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId + '/jobtask', { json: true }, (err2, res2, body2) => {
                        //console.log("Job Instance id : " + body2.content[0].id);
                        //console.log("New job instance : " + body2.content[0].startDateTime);
                        //console.log("comparing : " + lastexecutionStarttime.getTime() + " with " +  today.getTime());
                        lastexecutionStarttime = new Date(body2.content[0].startDateTime);
                        //console.log("New job instance : " + lastexecutionStarttime.getTime());
                        if(lastexecutionStarttime.getTime() > today.getTime()) {
                          mainResponse.send('{ jobId: ' + jobId + ', instanceId: ' + body2.content[0].id + '}');
                          clearInterval(interval);
                        }
                    });
                  }, 5000);
               }
             }
           );

        } else {
          console.log("Job is already running. Current status: " + status);
          mainResponse.send('{ message: Job is already running. Please retry later.}');
        }

      }
    });
  }
});

// Run the server
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
