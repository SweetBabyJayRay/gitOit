////////////////////////////////////////////////////////////////////////////////
// Program: githubOrgChecker.js
// Summary: Query the GitHub API for the usernames in a GitHub organization.
//          For each username, check if there is a name.  If not, send an E-mail 
//          requesting the user to fill in their name.
//          The list of usernames without a name is then uploaded to AWS.
// NOTE: This program is NOT indicative of best practices; a proper program will
//       NEVER include the API key like this, but I was told to not spend too
//       long on it, so this is just a simple example of API interactions.  :)
////////////////////////////////////////////////////////////////////////////////



/// --- USER-MODIFIABLE VARIABLES --- ///

// The GitHub organization under scrutiny; change this at will.
var githubOrg = "SBJR4BYU";

// AWS data: set your personal keys, region, and S3 bucket here.
var awsAPIKey = '';
var awsAPISecret = '';
var awsAPIRegion = 'us-west-2';
var awsS3Bucket = '';


/// --- NON-MODIFIABLE SECTION --- ///

////////////////////////////////////////////////////////////////////////////////
// Function: saveFileToAWS
// Summary: Upload a file to an AWS S3 bucket. 
// Inputs: theFile - A file object to be uploaded to AWS.
// Assumptions: The user must first set the AWS data at the top of the file! 
////////////////////////////////////////////////////////////////////////////////
function saveFileToAWS(theFile)
{
   var creds = true; // Assume good credentials.

   // Set the required data.
   AWS.config.update({accessKeyId : awsAPIKey, 
                      secretAccessKey : awsAPISecret});
   AWS.config.region = awsAPIRegion;

   // Verify that the credentials are good.
   AWS.config.getCredentials(function(err) 
      {
         if (err) // Credentials are bad!
         {
            alert(err + "\n\nPlease fill in your AWS data at the top of the file.");
            creds = false;
         }

      });

   var bucket = new AWS.S3({params: {Bucket: awsS3Bucket}});

   // Only try to upload if the file exists and the credentials are valid.
   if (theFile && creds)
   {
      var params = {Key: 'emails.txt', 
                    ContentType: theFile.type, 
                    Body: theFile};

      // Upload the data!			  
      bucket.upload(params).on('httpUploadProgress', function(evt) 
         {
            console.log("Uploaded :: " + parseInt((evt.loaded * 100) / evt.total)+'%');
         }).send(function(err, data) 
         {
            alert("File uploaded successfully.");
         });
   }
}



////////////////////////////////////////////////////////////////////////////////
// Function: emailReminderIfNameNull
// Summary: Take the response data from an XMLHttpRequest object that queried 
//          the GitHub API for a username, parse the request into a JSON object,
//          and send an E-mail requesting the user to fill in their name.
// Assumptions: This function should be called from XMLHttpRequest.onload! 
////////////////////////////////////////////////////////////////////////////////
function emailReminderIfNameNull()
{
   // As we've passed nothing to the function, "this" will refer to the 
   // XMLHTTPRequest object that calls this function.
   var jsonUserData = JSON.parse(this.responseText);

   if (jsonUserData.name === null) // The name property is null.
   {
   	// If the E-mail is null, we can't send a reminder; tell the operator.
      if (jsonUserData.email === null)
      {
      	 usernamesText += jsonUserData.login + "\n";
      	 document.write("No E-mail for " + jsonUserData.login + "!<br />");
      }
      else // There's an E-mail address listed, so send a reminder!
      {
         // JavaScript cannot send an E-mail, so we need to invoke some server-
      	 // side code here or connect to an E-mail API to actually send stuff.
      	 // <Fill_In_Later>

      	 // Assume that the E-mail has been sent at this point.
      	 usernamesText += jsonUserData.login + "\n";
      	 document.write("E-mail sent to " + jsonUserData.login + "!<br />");
      }
   }
}



////////////////////////////////////////////////////////////////////////////////
// Function: getUserData
// Summary: Send an XMLHttpRequest to the GitHub API for the username passed in.
//          Uses the onload function to check for a  null name and send E-mail.
// Inputs: login - The GitHub username for which to request data.
////////////////////////////////////////////////////////////////////////////////
function getUserData(login, usernamesText)
{
   var userURL = 'https://api.github.com/users/' + login;
   var userRequest = new XMLHttpRequest();

   // Once we have the data, call the function to check the name and send an
   // E-mail if the name is set to null.
   userRequest.onload = emailReminderIfNameNull;

   // Initialize the request
   userRequest.open('get', userURL, false);
   // NOTE: I don't like use the syncronous request here, but I've not used this
   // function before, so I expect that someone can teach me a better way.  :)
   // And yes, I realize that it's depricated; another reason to learn more!

   // Execute the request.
   userRequest.send();
}



////////////////////////////////////////////////////////////////////////////////
// Function: getUsersInOrg
// Summary: Take the response data from an XMLHttpRequest object that queried
//          the GitHub API for an organization, parse the request into a JSON
//          object, and then call the function to get the data for each user.
// Assumptions: This function should be called from XMLHttpRequest.onload! 
////////////////////////////////////////////////////////////////////////////////
function getUsersInOrg() 
{
   // Since we've passed nothing to the function, "this" will refer to the 
   // XMLHTTPRequest object that calls this function.
   var jsonResponse = JSON.parse(this.responseText);

   // Loop through each username and get their public data.
   for (var i = 0; i < jsonResponse.length; ++i)
   {
      getUserData(jsonResponse[i].login, usernamesText); // "login" is the GitHub username.
   }
}



/// --- BEGIN CODE PROCESSING --- ///


// Create the URL, and the request object.
var reqURL = 'https://api.github.com/orgs/' + githubOrg + '/members';
var request = new XMLHttpRequest();

var usernamesText = ""; // Holds the string for the file.

// Set the function to use when all is ready.
request.onload = getUsersInOrg;

// Initialize the request.
request.open('get', reqURL, false);

// And here we go!
request.send();

// Create the file object with the list of usernames.
var theFile = new File([usernamesText], "emails.txt", {type: "text/plain"});

// Save it out to the AWS S3 bucket via the AWS API.
saveFileToAWS(theFile);
