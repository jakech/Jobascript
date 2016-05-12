var Promise = require('bluebird');
var _ = require('underscore');
var db = require('../server/database');
var rp = require('request-promise');
var Entities = require('html-entities').AllHtmlEntities;

var entities = new Entities();

var GITHUB_URL = 'https://jobs.github.com/positions.json';
var INDEED_URL = 'http://api.indeed.com/ads/apisearch';

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
    return Promise.all([
      fetchGitHub(company.name, company.id),
      fetchIndeed(company.name, company.id)
    ]);
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

function fetchIndeed(comName, comID) {
  return rp({
    uri: INDEED_URL,
    qs: {
      format: 'json',
      v: 2,
      publisher: '9810665890415219', // key
      q: 'company:' + comName + ' title:software',
      l: 'sf',
      // sort: 'date',
      jt: 'fulltime', // job type
      limit: 1000,
      radius: 1000
    },
    json: true
  }).then(function (data) {
    console.log('INDEED >>> ', data.totalResults, ' jobs for ', comName);
    var theJobs = jobsFilter(data.results, comName);
    return mapColumns('indeed', theJobs, comID);
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
    console.log('GITHUB >>> ', data.length, ' jobs for ', comName);

    return mapColumns('github', jobsFilter(data, comName), comID);
  });
}

function mapColumns(schema, jobs, comID) {
  return jobs.map(function (job) {
    var columns = {};
    if (schema === 'github') {
      columns = {
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
    } else if (schema === 'indeed') {
      columns = {
        title: job.jobtitle,
        company_name: job.company,
        url: job.url,
        description: entities.encode(job.snippet),
        // visa_sponsored: null,
        // remote_ok: null,
        // relocation: null,
        created: job.date,
        city: job.formattedLocation,
        company_id: comID
      };
    }
    return columns;
  });
}

function jobsFilter(jobs, comName) {
  return _.filter(jobs, function (job) {
    var loComName = job.company.toLowerCase();
    console.log('>>>> ', loComName, 'want: ', loComName.indexOf(comName) !== -1);
    return loComName.indexOf(comName) !== -1;
  });
}
