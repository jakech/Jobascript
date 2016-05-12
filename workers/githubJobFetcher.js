var Promise = require('bluebird');
var _ = require('underscore');
var db = require('../server/database');
var rp = require('request-promise');
var Entities = require('html-entities').AllHtmlEntities;
 
var entities = new Entities();

var GITHUB_URL = 'https://jobs.github.com/positions.json';

db.companiesTable.getCompanies({ size: false })
.then(function (list) {
  console.log('fetching for ' + list.length + ' companies');
  return Promise.map(list, function (company) {
    return fetchGitHub(company.name, company.id);
  });
})
.then(function (listOfJobs) {
  return _.flatten(listOfJobs); // flatten array of arrays
})
.then(function (flattenArray) {
  return Promise.map(flattenArray, addJobs);
})
.then(function (array) {
  console.log(array.length + ' jobs added to DB');
  return;
})
.catch(function (error) {
  console.log('FAILED: ', error);
});

function addJobs(obj) {
  return db.jobsTable.addJob(obj);
}

function fetchGitHub(comName, comID) {
  return rp({
    uri: GITHUB_URL,
    qs: {
      search: comName,
      location: 'sf',
      full_time: true
    },
    json: true
  }).then(function (data) {
    var theJobs = _.filter(data, jobFilter);
    return theJobs.map(mapJobToColumns);
  });

  function mapJobToColumns (job) {
    return {
      title: job.title,
      company_name: job.company,
      url: job.url,
      description: entities.encode(job.description),
      // visa_sponsored: null,
      // remote_ok: null,
      // relocation: null,
      created: job.created_at,
      city: job.location,
      company_id: comID
    };
  }

  function jobFilter(job) {
    var loComName = job.company.toLowerCase();
    console.log('>>>> ', loComName, 'want: ', loComName.indexOf(comName) !== -1);
    return loComName.indexOf(comName) !== -1;
  }
}

