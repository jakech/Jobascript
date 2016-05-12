var Promise = require('bluebird');
var _ = require('underscore');
var db = require('../server/database');
var rp = require('request-promise');
var Entities = require('html-entities').AllHtmlEntities;

var entities = new Entities();

var GITHUB_URL = 'https://jobs.github.com/positions.json';

var companiesWithoutJobs = [
  'SELECT companies.name, companies.id',
  'FROM companies LEFT JOIN jobs',
  'ON (companies.id <> jobs.company_id)',
  'GROUP BY companies.id;'
].join(' ');

db.pgp.query(companiesWithoutJobs)
// db.companiesTable.getCompanies({ size: false })
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
  console.log('>>>>>> Completed!! <<<<<<');
  console.log(_.reject(array, (a) => !a).length + ' jobs added to DB');
})
.catch(function (error) {
  console.log('FAILED: ', error);
});

function addJobs(obj) {
  return db.jobsTable.addJob(obj)
  .then(function (id) {
    console.log('JOB!: ', obj.title + ' from ' + obj.company_name + ' added with id: ' + id);
    return id;
  })
  .catch(function (reason) { // catch exisiting jobs
    if (reason.constraint === 'jobs_url_key') {
      console.log('JOB!: ', obj.title, ' already exisits');
    }
    return false;
  });
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
    console.log('>>> ', data.length, ' jobs for ', comName);
    var theJobs = _.filter(data, jobFilter);
    return theJobs.map(mapJobToColumns);
  });

  function mapJobToColumns(job) {
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

