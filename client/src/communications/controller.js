module.exports = function ($scope, Comm, currentCompany) {
  console.log(currentCompany);
  $scope.emails = Comm.getEmails();
  $scope.auth = Comm.checkAuth;
};
