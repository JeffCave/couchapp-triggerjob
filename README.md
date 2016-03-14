# couchapp-triggerjob 

CouchDB design document to be used with [couch-daemon-triggerjob](https://github.com/Smileupps/couch-daemon-triggerjob) external daemon, to add asynchronous background events to CouchDB.

## Installation 

1. Install [couch-daemon-triggerjob](https://github.com/Smileupps/couch-daemon-triggerjob) to your CouchDB instance
1. Download this couchapp to your local disk
1. With your preferred [Couchapp Deployment tool](https://www.smileupps.com/wiki), upload the downloaded couchapp folder to your CouchDB instance, using *app* as database name
1. To let the daemon know the path to your couchapp, create the following CouchDB *_config* parameter:

		section: triggerjob
		parameter: job_path
		value: /app/_design/trigger/_rewrite

	If you are going to watch multiple databases, use comma as separator:

		value: /app1/_design/trigger/_rewrite,/app2/_design/trigger/_rewrite

1. If your CouchDB instance is admin password protected (no more in Admin Party), create the following *_config* parameter:

		section: triggerjob
		parameter: job_authorization
		value: adminusername:adminpassword
		
	Don't use your regular admin credentials: create a new pair for daemon-use only:

		section: admins
		parameter: daemon-username
		value: daemon-password

## How to Use

You can monitor daemon status and messages using the CouchDB *_log* handler, or using the **Log** feature within **Fauxton administration interface**.

### Examples

Have a look at Smileupps for some [trigger use case examples](https://www.smileupps.com/couch-daemon-triggerjob)

## How it works

This couchapp works by:
* forwarding daemon requests from */follow/changes* to a filtered CouchDB changes handler: **used by the daemon to continuously listen for new triggers**
* forwarding daemon requests from */trigger* to an update function *updates/trigger.js*: this **lets the daemon update your CouchDB database**, with trigger results and execution status
* forwarding any other daemon request to your main couchapp application stored in *_design/app*: this **lets you implement your own application behaviour**. For secure and easy couchapp development, you can follow the *action-based write approach* described within the [Chatty couchdb tutorial](https://www.smileupps.com/couchapp-tutorial-chatty-write-api).

