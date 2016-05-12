var Promise = require('bluebird');
var _ = require('underscore');
var db = require('../server/database');
var rp = require('request-promise');
var Entities = require('html-entities').AllHtmlEntities;

var entities = new Entities();

var GITHUB_URL = 'https://jobs.github.com/positions.json';
var INDEED_URL = 'http://api.indeed.com/ads/apisearch';
var AUTHJOBS_URL = 'https://authenticjobs.com/api/';

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
      fetchIndeed(company.name, company.id),
      fetchAuthjobs(company.name, company.id)
    ])
    .then(function (arrayOfJobArrays) {
      console.log('====== ', company.name, ' ======');
      _.each(arrayOfJobArrays, function (arr, i) {
        var sources = ['GITHUB', 'INDEED', 'AUTHJOBS'];
        console.log(arr.length + ' jobs from ' + sources[i]);
      });
      console.log('^^^^^^ ', company.name, ' ^^^^^^');
      return arrayOfJobArrays;
    });
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
  console.log('adding... ', obj.title);
  return db.jobsTable.addJob(obj)
  .then(function (id) {
    console.log('JOB!: ', obj.title + ' at ' + obj.company_name + ' added with id: ' + id);
    return id;
  })
  .catch(function (reason) { // catch exisiting jobs
    if (reason.constraint === 'jobs_url_key') {
      console.log('JOB!: ', obj.title, ' already exisits');
    }
    return false;
  });
}

function fetchAuthjobs(comName, comID) {
  return rp({
    uri: AUTHJOBS_URL,
    json: true,
    qs: {
      api_key: '291d984046483ad333ac5978886bb9ad',
      format: 'JSON',
      method: 'aj.jobs.search',
      company: comName,
      keywords: 'software, developer, engineer',
      type: 1, // Fulltime
      // category: 4, // Front End Engineering, 2 is Back End
      perpage: 100
    }
  }).then(function (data) {
    console.log('AUTHJOBS >>> ', data.listings.total, ' jobs for ', comName);
    var theJobs = jobsFilter(data.listings.listing, comName, (j) => j.company.name);
    return mapColumns('authjobs', theJobs, comID);
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
    var theJobs = jobsFilter(data.results, comName, (j) => j.company);
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

    return mapColumns('github', jobsFilter(data, comName, (j) => j.company), comID);
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
    } else if (schema === 'authjobs') {
      columns = {
        title: job.title,
        company_name: job.company.name,
        url: job.apply_url || job.url,
        description: entities.encode(job.perks + '<br>' + job.description),
        // visa_sponsored: null,
        remote_ok: !!job.telecommuting,
        relocation: !!job.relocation_assistance,
        created: job.post_date,
        city: job.formattedLocation || job.company.location.name,
        company_id: comID
      };
    }
    return columns;
  });
}

function jobsFilter(jobs, comName, comNameColumnFunc) {
  return _.filter(jobs, function (job) {
    var loComName = comNameColumnFunc(job).toLowerCase();
    // console.log('>>>> ', loComName, 'want: ', loComName.indexOf(comName) !== -1);
    return loComName.indexOf(comName) !== -1;
  });
}
