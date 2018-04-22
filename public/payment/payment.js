var app = angular.module('lunchApp');

app.controller('PaymentController', function ($http, $q, $timeout, CustomModalService) {
    var vm = this;
    vm.payments = [];
    var page = 1;
    var limit = 50;
    vm.isQuerying = false;
    vm.hasMoreData = true;

    function updateList() {
        if (page === 1) {
            vm.payments = [];
        }
        vm.isQuerying = true;
        $http
            .post('/payment/getList', {
                page: page,
                limit: limit
            })
            .then(function (successResponse) {
                vm.isQuerying = false;
                var currentData = !!successResponse && !!successResponse.data && !!successResponse.data.payments && successResponse.data.payments || [];
                vm.hasMoreData = currentData.length === limit;
                vm.payments = vm.payments.concat(currentData);
            }, function (errorResponse) {
                vm.isQuerying = false;
                console.log(errorResponse);
                alert('Error while getting Payments.');
            });
    };
    updateList();

    vm.loadNextPage = function () {
        if (!!vm.payments[(vm.payments.length || 1) - 1].isInEditMode) {
            return;
        }
        page++;
        updateList();
    };

    vm.addPayment = function () {
        vm.payments.unshift({
            payDate: new Date(),
            fromUserUid: { _id: '', name: '' },
            toUserUid: { _id: '', name: '' },
            amount: 0,
            isInEditMode: true
        });
        vm.enableTypeAheads(0);
    };

    vm.savePayment = function (p) {
        var url = '/payment/create';
        if (!!p._id) { url = '/payment/update'; }
        var savingP = angular.copy(p);
        delete savingP.isInEditMode;
        savingP.fromUserUid = savingP.fromUserUid._id;
        savingP.toUserUid = savingP.toUserUid._id;
        $http
            .post(url, savingP)
            .then(function (successResponse) {
                console.log(successResponse);
                p._id = successResponse.data.uid;
            }, function (errorResponse) {
                console.log(errorResponse);
                alert('Error while saving Payment.');
            });
    };

    function searchUsers(u, process) {
        $http
            .post('/user/getList', {
                name: u
            })
            .then(function (successResponse) {
                process(!!successResponse && !!successResponse.data && successResponse.data.users || []);
            }, function (errorResponse) {
                console.log(errorResponse);
                alert('Error while searching Users');
            });
    };

    vm.enableTypeAheads = function (index) {
        $timeout(function () {
            $('#fromUserTypeAhead' + index).typeahead({
                source: searchUsers,
                afterSelect: function (selectedUser) {
                    $timeout(function () { vm.payments[index].fromUserUid = selectedUser; });
                }
            });
            $('#toUserTypeAhead' + index).typeahead({
                source: searchUsers,
                afterSelect: function (selectedUser) {
                    $timeout(function () { vm.payments[index].toUserUid = selectedUser; });
                }
            });
        });
    };

    vm.enableDetailTypeAhead = function () {
        $timeout(function () {
            $('#detailUserTypeAhead').typeahead({
                source: searchUsers,
                afterSelect: function (selectedUser) {
                    $timeout(function () {
                        vm.detailUserUid = selectedUser;
                        updatePendings();
                    });
                }
            });
        });
    };

    vm.openDetailModal = function () {
        vm.pendingPayments = [];
        vm.pendingReceives = [];
        vm.detailUserUid = { _id: '', name: '' };
        CustomModalService.Open('pendingPaymentsModal');
    };

    vm.closeDetailModal = function () {
        CustomModalService.Close('pendingPaymentsModal');
    };

    function updatePendings() {
        vm.isLoadingPendings = true;
        $http
            .post('/payment/getPendings', {
                userUid: vm.detailUserUid._id
            })
            .then(function (successResponse) {
                vm.isLoadingPendings = false;
                if (!!successResponse && !!successResponse.data) {
                    vm.pendingReceives = (successResponse.data.pendingReceives || []).filter(function (pr) { return !!pr.amount; });
                    vm.pendingPayments = (successResponse.data.pendingPayments || []).filter(function (pp) { return !!pp.amount; });
                    vm.totalPP = 0;
                    (vm.pendingPayments || []).forEach(function (pp) { vm.totalPP = vm.totalPP + (pp.amount || 0); });
                    vm.totalPR = 0;
                    (vm.pendingReceives || []).forEach(function (pr) { vm.totalPR = vm.totalPR + (pr.amount || 0); });
                }
            }, function (errorResponse) {
                vm.isLoadingPendings = false;
                console.log(errorResponse);
                alert('Error while getting Pending Payments.');
            });
    };

    vm.datifyPayDate = function (index) {
        vm.payments[index].payDate = new Date(vm.payments[index].payDate);
    };
});