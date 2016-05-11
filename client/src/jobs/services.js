module.exports = function ($http) {
   // remove comment and use $http later
  function getJobs(currentCompany) {
    return $http({
      method: 'GET',
      url: '/api/jobs',
      params: { currentCompany: currentCompany }
    })
    .then(function (resp) {
      console.log('this is the response', resp.data);
      return resp.data;
    })
    .catch(function (caught) {
      console.log('error in services js ', caught);
    });
  }
  return {
    getJobs: getJobs
  };
};
