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

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});

// Workflow Instance
app.get('/api/plateform/:plateformId/workflow/:workflowId', (req, mainResponse) => {

  var workflowId = req.params.workflowId;
  var plateformId = req.params.plateformId;

    if(workflowId == null || plateformId == null) {
      mainResponse.send('{ message: Error, the variables are not defined workflowId, plateformId}');
    }
    else {
      // Check if the workflow is not already running
      request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/workflow/' + workflowId, { json: true }, (err, res, body) => {

        if (err) {
          console.log(err);
          mainResponse.send('{ message: An error occured. Please retry later or contact your administrator.}');
        } else {

          if(res.statusCode != 200) {
            console.log("An request error occured. The status code is different of 200");
          } else {

            var now = new Date();
            var today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

            // Get runningInstances
            if(body.hasOwnProperty('runningInstances')) {
              var runningInstances = body.runningInstances;
            } else {
              var runningInstances = -1;
            }

            // Get lastexecutionStarttime and status of last instance
            if(body.hasOwnProperty('lastInstance')) {
              var lastexecutionStarttime = new Date(body.lastInstance.startDateTime);
              var status = body.lastInstance.status;
            } else {
              var now2 = new Date();
              var lastexecutionStarttime = new Date(now2.getUTCFullYear(), now2.getUTCMonth(), now2.getUTCDate(),  now2.getUTCHours(), now2.getUTCMinutes(), now2.getUTCSeconds());
              var status = 'NEVER';
            }

            // Check if the workflow is running
            if(runningInstances == 0 && (status!='PENDING' && status!='REQUEST')) {
              // Run the workflow
              request.post({
                url: 'https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/workflow/' + workflowId + '/run',
                body: ""
              }, function(err, res, body){
                if (err) {
                  console.log(err);
                  mainResponse.send('{ message:Unable to run the workflow ' + workflowId + '. Please retry later or contact your administrator.}');
                } else {

                  if(res.statusCode != 204) {
                    console.log("An request error occured. The status code is different of 204 : " + res.statusCode);
                    mainResponse.send('{ message: An request error occured. The status code is different of 204 : ' + res.statusCode + ' }');
                  } else {

                    // Get id instance.
                    const interval = setInterval(() => {
                      request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/workflow/' + workflowId + '/instance', { json: true }, (err2, res2, body2) => {
                          lastexecutionStarttime = new Date(body2.content[0].startDate);
                          if(lastexecutionStarttime.getTime() > today.getTime()  ) {
                            mainResponse.send('{ workflow: ' + workflowId + ', instanceId: ' + body2.content[0].id + '}');
                            clearInterval(interval);
                          }
                      });
                    }, 5000);
                  }
                }
              }
            );

          } else {
            console.log('Workflow ' + workflowId + ' is already running.');
            mainResponse.send('{ message: Workflow ' + workflowId + ' is already running. Please retry later.}');
          }

        }
      }
    });

  }
});


// Job Instance
app.get('/api/plateform/:plateformId/job/:jobId', (req, mainResponse) => {

  var jobId = req.params.jobId;
  var plateformId = req.params.plateformId;

  if(jobId == null || plateformId == null) {
    mainResponse.send('{ message: Error, the variables are not defined jobId, plateformId}');
  } else {
    // Check if the job is not already running
    request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId, { json: true }, (err, res, body) => {

      if (err) {
        console.log(err);
        mainResponse.send('{ message: An error occured. Please retry later or contact your administrator.}');
      } else {

      if(res.statusCode != 200) {
        console.log("An request error occured. The status code is different of 200");
      } else {

        var now = new Date();
        var today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

        // Get lastexecutionStarttime and status of last instance
        if(body.hasOwnProperty('last_instance') && body.last_instance.hasOwnProperty('startDateTime') && body.last_instance.hasOwnProperty('status')){
          var lastexecutionStarttime = new Date(body.last_instance.startDateTime);
          var status = body.last_instance.status;
        } else {
          var now2 = new Date();
          var lastexecutionStarttime = new Date(now2.getUTCFullYear(), now2.getUTCMonth(), now2.getUTCDate(),  now2.getUTCHours(), now2.getUTCMinutes(), now2.getUTCSeconds());
          var status = 'NEVER';
        }

        // Check if the job is running
        if(status!='PENDING' && status!='QUEUED') {
          // Run the job
          request.post({
              url: 'https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId + '/run',
              body: ""
             }, function(err, res, body){
               if (err) {
                 console.log(err);
                 mainResponse.send('{ message:Unable to run the job ' + jobId + '. Please retry later or contact your administrator.}');
               } else {

               if(res.statusCode != 204) {
                 console.log("An request error occured. The status code is different of 204 : " + res.statusCode);
                 mainResponse.send('{ message: An request error occured. The status code is different of 204 : ' + res.statusCode + ' }');
               } else {
                  // Get id instance.

                  const interval = setInterval(() => {
                    request('https://' + username + ':' + password + '@'+ adress_manager +'/api/v1/platform/'+ plateformId +'/job/' + jobId + '/jobtask', { json: true }, (err2, res2, body2) => {
                        lastexecutionStarttime = new Date(body2.content[0].startDateTime);
                        if(lastexecutionStarttime.getTime() > today.getTime()) {
                          mainResponse.send('{ jobId: ' + jobId + ', instanceId: ' + body2.content[0].id + '}');
                          clearInterval(interval);
                        }
                    });
                  }, 5000);
               }
             }
             }
           );

        } else {
          console.log('Job ' + jobId + ' is already running. Current status: ' + status);
          mainResponse.send('{ message: Job ' + jobId + ' is already running. Please retry later.}');
        }

      }
    }
    });
  }
});



// Run the server
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
