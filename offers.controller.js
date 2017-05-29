(function () {
    'use strict';
    angular.module('pkp.controllers').controller('OffersCtrl', OffersCtrl);

    OffersCtrl.$inject = [
        '$scope',
        '$stateParams',
        '$state',
        '$ionicActionSheet',
        'OffersSvc',
        'DefaultSvc',
        'MyRequestSvc',
        '$rootScope',
        '$ionicHistory',
        '$filter',
        '$interval',
        'localStorageService',
        'ChatSvc'
    ];

    function OffersCtrl($scope, $stateParams, $state, $ionicActionSheet, OffersSvc, DefaultSvc, MyRequestSvc, $rootScope, $ionicHistory, $filter, $interval, localStorageService, ChatSvc) {

//        $rootScope.$ionicGoBack = function () {
//            DefaultSvc.clearCachedView(['menu.addrequest']).then(function () {
//                DefaultSvc.clearCachedView(['menu.myrequest']).then(function () {
//                    $state.go('menu.myrequest');
//                });
//            });
//        };

        $scope.$on('$ionicView.leave', function () {
            $interval.cancel($scope.refreshOffers);
        });

        if ($scope.extraUser.actions && ($scope.extraUser.isShowContactSeller === true || $scope.extraUser.isShareContactToSeller === true)) {
            $stateParams.requestID = $scope.extraUser.actions.stateRequestID;
            if ($scope.extraUser.actions.actionType == 'showContact' && $scope.extraUser.isShowContactSeller === true) {
                var actionParams = {requestID: $scope.extraUser.actions.stateRequestID, sellerID: $scope.extraUser.actions.actionSellerID, actionType: 'show_seller_contact'};
                takePoints(actionParams).then(function (response) {
                    if (response === true) {
                        var actionsSellerInfo = localStorageService.get('actionsSellerInfo');
                        getSellerInfo(actionsSellerInfo.sellerName, actionsSellerInfo.sellerPhone);
                        $scope.extraUser.isShowContactSeller = false;
                        DefaultSvc.clearCachedView(['menu.share']);
                        $scope.extraUser.actions = {};
                    }
                });
            }
            else if ($scope.extraUser.actions.actionType == 'shareContact' && $scope.extraUser.isShareContactToSeller === true) {
                var actionParams = {requestID: $scope.extraUser.actions.stateRequestID, sellerID: $scope.extraUser.actions.actionSellerID, actionType: 'share_contact_to_seller'};
                takePoints(actionParams).then(function (response) {
                    if (response === true) {
                        DefaultSvc.showToast($scope.texts.success_message_share_contact_to_seller, 'middle', false, 3500);
                        $scope.extraUser.isShareContactToSeller = false;
                        DefaultSvc.clearCachedView(['menu.share']);
                        $scope.extraUser.actions = {};
                    }
                });
            }
            DefaultSvc.clearCachedView(['menu.share']);
        }

        var vm = this;
        vm.getRequestInfo = getRequestInfo;
        vm.getOffersForRequest = getOffersForRequest;
        vm.getSellerInfo = getSellerInfo;
        vm.removeRequest = removeRequest;
        vm.closeRequest = closeRequest;
        vm.offerAction = offerAction;
        vm.pullToRefresh = pullToRefresh;
        vm.request = {};
        vm.requestID = $stateParams.requestID;
        vm.sellerID = 0;
        vm.offers = {};
        vm.sellerIDs = [];
        vm.offerState = [];
        //vm.isAction = 0;
        $scope.extraUser.actions = {};
        $scope.extraUser.isShowContactSeller = false;
        $scope.extraUser.isShareContactToSeller = false;
        $scope.extraUser.isNewOfferFromSeller = false;


        function getRequestInfo() {
            DefaultSvc.showLoading();
//            $ionicHistory.nextViewOptions({
//                disableAnimate: true,
//                disableBack: true
//            });
            if (!vm.requestID) {
                return false;
            }
            OffersSvc.getRequestByID(vm.requestID).then(function (result) {
                vm.request = result;
                DefaultSvc.hideLoading();
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }

        function getOffersForRequest() {
            DefaultSvc.showLoading();
            if (!vm.requestID) {
                return false;
            }
            OffersSvc.getOffersForRequest(vm.requestID).then(function (result) {
                vm.offers = result;
                var sellerIDs = [];
                result.forEach(function (seller) {
                    sellerIDs.push(seller.seller_id);
                })
                vm.sellerIDs = sellerIDs;
                getOfferState();
                DefaultSvc.hideLoading();
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }

        function getOfferState() {
            if ((!vm.sellerIDs || vm.sellerIDs.length == 0) || !vm.requestID) {
                return false;
            }

            var requestData = {requestID: vm.requestID, sellerIDs: vm.sellerIDs};

            OffersSvc.getOfferState(requestData).then(function (response) {
                if (response.status == 'OK') {
                    vm.offerState = response.result;
                }

            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });

        }

        function getSellerInfo(sellerName, sellerMobile) {
            var sellerName = sellerName;
            $scope.sellerMobile = sellerMobile;
            var params = {
                title: sellerName,
                subTitle: $scope.texts.seller_info_subtitle,
                template: '<ion-item class="item-icon-left item ic-selected" style="text-align:center;" ><i class="icon ion-ios-telephone"></i>{{sellerMobile}}</ion-item>',
                scope: $scope,
                okText: '<i class="icon ion-ios-telephone" href="tel:{{sellerMobile}}"></i>',
                cancelText: '<i class="ion-close"></i>',
                action: actionSellerInfo
            };
            DefaultSvc.showIonicShowPopup(params);
            return;
        }

        function actionSellerInfo() {
            var call = "tel:" + $scope.sellerMobile;
            document.location.href = call;
        }

        function removeRequest(requestID) {
            vm.requestID = requestID;
            var params = {
                title: $scope.texts.title_request_delete,
                template: $scope.texts.confirm_delete_request,
                okText: $scope.texts.button_delete,
                cancelText: $scope.texts.button_cancel,
                action: removeAction
            };
            DefaultSvc.showIonicConfirmPopup(params);
            return;
        }

        function removeAction() {
            DefaultSvc.showLoading();
            var requestStatus = 'removed';
            MyRequestSvc.updateRequestStatus(vm.requestID, requestStatus).then(function (result) {
                if (!vm.request) {
                    return false;
                }
                if (result.status == 'OK') {
                    DefaultSvc.hideLoading();
                    DefaultSvc.clearCachedView(['menu.myrequest']).then(function () {
                        $state.go('menu.myrequest');
                    });
                }
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }

        function closeRequest(requestID) {
            vm.requestID = requestID;
            var params = {
                title: $scope.texts.title_request_close,
                template: $scope.texts.confirm_close_request,
                okText: $scope.texts.button_close,
                cancelText: $scope.texts.button_cancel,
                action: closeRequestAction
            };
            DefaultSvc.showIonicConfirmPopup(params);
            return;
        }

        function closeRequestAction() {
            DefaultSvc.showLoading();
            var requestStatus = 'closed';
            MyRequestSvc.updateRequestStatus(vm.requestID, requestStatus).then(function (result) {
                if (!vm.request) {
                    return false;
                }
                if (result.status == 'OK') {
                    DefaultSvc.hideLoading();
                    DefaultSvc.clearCachedView(['menu.myrequest']).then(function () {
                        $state.go('menu.myrequest');
                    });
                }
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }


        function offerAction(requestID, sellerID, sellerName) {

            var requestID = requestID;
            var sellerID = sellerID;
            var sellerName = sellerName;
            var messageButton = '';

            if (vm.offerState && vm.offerState[sellerID] && vm.offerState[sellerID].countNewMessage > 0) {
                messageButton = '<span class="positive"><i class="icon ion-chatbox"></i> <span class="badge badge-assertive badgePosition badgeChatMessage">' + vm.offerState[sellerID].countNewMessage + '</span> '+$scope.texts.write_message_button+'</span>';
            } else {
                messageButton = '<span class="positive"><i class="icon ion-chatbox"></i>' + $scope.texts.send_message_button + '</span>';
            }

            var buttons = [
                {text: '<span class="positive"><i class="icon ion-eye"></i>  ' + $scope.texts.button_seller_contact_info + ' </span>'},
                {text: '<span class="positive"><i class="icon ion-email"></i>  ' + $scope.texts.button_share_contact_to_seller + ' </span>'},
                {text: messageButton},
            ];

            $ionicActionSheet.show({
                titleText: $scope.texts.title_choise_action,
                buttons: buttons,
                cancelText: $scope.texts.button_cancel,
                cancel: function () {
                },
                buttonClicked: function (index) {

                    if (index === 0) {
                        var actionParams = {requestID: requestID, sellerID: sellerID, actionType: 'show_seller_contact'};
                        checkUserAction(actionParams).then(function (result) {
                            if (result.status == 'NEED_POINT') {
                                $scope.extraUser.actions.actionType = 'showContact';
                                localStorageService.set('actionsSellerInfo', {sellerName: sellerName, sellerPhone: result.seller_contact.mobile});
                                $scope.extraUser.actions.actionSellerID = sellerID;
                                $scope.extraUser.actions.stateRequestID = requestID;
                                $state.go('menu.share');
                            } else if (result.status == 'OK') {
                                takePoints(actionParams).then(function (response) {
                                    if (response === true) {
                                        getSellerInfo(sellerName, result.seller_contact.mobile);
                                    }
                                });
                            } else if (result.status == 'ALREADY') {
                                getSellerInfo(sellerName, result.seller_contact.mobile);
                            }
                        }).catch(function (err) {
                            DefaultSvc.hideLoading();
                        });
                    }
                    else if (index === 1) {
                        var actionParams = {requestID: requestID, sellerID: sellerID, actionType: 'share_contact_to_seller'};
                        checkUserAction(actionParams).then(function (result) {
                            if (result.status == 'NEED_POINT') {
                                $scope.extraUser.actions.stateRequestID = requestID;
                                $scope.extraUser.actions.actionSellerID = sellerID;
                                $scope.extraUser.actions.actionType = 'shareContact';
                                $state.go('menu.share');
                            } else if (result.status == 'OK') {
                                takePoints(actionParams).then(function (response) {
                                    if (response === true) {
                                        DefaultSvc.showToast($scope.texts.success_message_share_contact_to_seller, 'middle', false, 3500);
                                    }
                                });
                            } else if (result.status == 'ALREADY') {
                                DefaultSvc.showToast($scope.texts.success_message_already_share_contact_to_seller, 'middle', false, 3500);
                            }
                        });
                    }
                    else if (index == 2) {
                        var params = {requestID: requestID, sellerID: sellerID, customerID: 0};
                        ChatSvc.getChatID(params).then(function (response) {
                            if (response.status == 'OK') {
                                var chatID = response.chat_id;
                                getOffersForRequest();
                                $state.go('menu.chat', {chatID: chatID});
                                return;
                            }

                        }).catch(function (err) {
                            DefaultSvc.hideLoading();
                            DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
                        });
                    }
                    return true;
                }
            });
        }

        function checkUserAction(checkParams) {
            DefaultSvc.showLoading();
            return OffersSvc.checkUserAction(checkParams).then(function (result) {
                DefaultSvc.hideLoading();
                return result;
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }

        function takePoints(params) {
            DefaultSvc.showLoading();
            return OffersSvc.takePoints(params).then(function (result) {
                if (result.status == 'OK') {
                    var points = parseInt($scope.user.points);
                    $scope.user.points = points - 1;
                    DefaultSvc.hideLoading();
                    return true;
                }
            }).catch(function (err) {
                DefaultSvc.hideLoading();
                DefaultSvc.alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
            });
        }

        function in_array(value, array) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] == value) {
                    return true;
                }
            }
            return false;
        }

        function init() {
            DefaultSvc.showLoading();
            $scope.lastUpdated = new Date();
            relativeDate();
            vm.getRequestInfo();
            vm.getOffersForRequest();
            DefaultSvc.hideLoading();
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
            $rootScope.$broadcast('scroll.refreshComplete');
        }

        function relativeDate() {
            var relativeDate = $filter('relativeDate');
            vm.relativeDate = relativeDate;
        }

        function pullToRefresh() {
            init();
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
            $rootScope.$broadcast('scroll.refreshComplete');
        }

        function refreshing() {
            $scope.lastUpdated = new Date();
            relativeDate();
            vm.getRequestInfo();
            vm.getOffersForRequest();
        }

        init();
        //$scope.refreshOffers = $interval(refreshing, 10000);

    }

})();