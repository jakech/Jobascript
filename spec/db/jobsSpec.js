var Promise = require('bluebird');
var db = require('../../server/database').companiesTable;
var jobsTable = require('../../server/database').jobsTable;
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

/* eslint-disable no-unused-vars */
var expect = chai.expect;
var should = chai.should();
/* eslint-enable */

describe('Database jobs', function () {
  var COM_ID = '';
  var JOB_ID = '';

  var companies = [
    {
      name: 'stripe',
      display_name: 'Stripe',
      domain: 'stripe.com',
      logo: 'https://logo.clearbit.com/stripe.com'
    },
    {
      name: 'apple',
      display_name: 'Apple',
      domain: 'apple.com',
      logo: 'https://logo.clearbit.com/apple.com'
    },
    {
      name: 'google',
      display_name: 'Google',
      domain: 'google.com',
      logo: 'https://logo.clearbit.com/google.com'
    }
  ];

  before(function (done) {
    Promise.map(companies, function (com) {
      return db.addCompany(com);
    })
    .then(function (arr) {
      COM_ID = arr[1];
      done();
    })
    .catch(function (reason) {
      console.log('in test, ', reason);
      done(reason);
    });
  });

  after(function (done) {
    return db.clearAll()
    // .then(jobsTable.clearAllJobs)
    .then(function () {
      done();
    });
  });

  describe('addJob', function () {
    it('add a job', function () {
      return jobsTable.addJob({
        title: 'Software Engineer'
      })
      .should.eventually.be.fullfilled;
    });

    it('return an id', function () {
      return jobsTable.addJob({
        title: 'Software Engineer'
      })
      .should.eventually.satisfy(function (num) {
        JOB_ID = num;
        return !isNaN(Number(num));
      });
    });
  });

  describe('updateJobs', function () {
    it('should works', function () {
      return jobsTable.updateJobs(JOB_ID, { title: 'New Title' })
      .should.eventually.be.fullfilled;
    });
  });

  describe('getJobs', function () {
    it('get jobs by company id', function () {
      return jobsTable.getJobs({ company_id: COM_ID })
      .should.eventually.be.fullfilled;
    });
  });
});
