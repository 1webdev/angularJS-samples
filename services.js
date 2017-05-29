(function () {
    'use strict';

    angular.module('pkp.services', []).factory('DefaultSvc', DefaultSvc);

    DefaultSvc.$inject = [
        '$http',
        '$q',
        '$state',
        '$httpParamSerializerJQLike',
        '$ionicHistory',
        '$ionicPopup',
        '$ionicLoading',
        'AppConfig',
        'localStorageService',
        'ionicToast',
        '$cordovaPushV5'
    ];

    function DefaultSvc($http, $q, $state, $httpParamSerializerJQLike, $ionicHistory, $ionicPopup, $ionicLoading, AppConfig, localStorageService, ionicToast, $cordovaPushV5) {
        var defaultService = {
            httpRequest: httpRequest,
            showIonicAlertPopup: showIonicAlertPopup,
            showLoading: showLoading,
            hideLoading: hideLoading,
            showIonicConfirmPopup: showIonicConfirmPopup,
            showIonicShowPopup: showIonicShowPopup,
            clearCachedView: clearCachedView,
            showToast: showToast,
            deviceRegistration: deviceRegistration,
            deviceRemove: deviceRemove,
            getAllTexts: getAllTexts,
            refreshUserData: refreshUserData,
            getAllPlaceholders: getAllPlaceholders,
            alertErrorConnect: alertErrorConnect,
            getConfigs: getConfigs,
            needAuth: needAuth
        };
        return defaultService;

        function httpRequest(params) {
            //showLoading();
            var def = $q.defer();
            var method = params.method ? params.method : 'GET';

            var requestOptions = {
                method: method,
                url: AppConfig.apiUrl + params.url,
                //timeout : 5000,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            };
            if (params.data) {
                requestOptions.data = $httpParamSerializerJQLike(params.data);
            }
            if (!params.withoutAccessToken) {
                requestOptions.headers['x-access-token'] = localStorageService.get('token');
                requestOptions.headers['user_language'] = localStorageService.get('langPrefix') ? localStorageService.get('langPrefix') : 'en';
            }

            if (method == 'POST') {
                requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            }

            if (params.params) {
                requestOptions.params = params.params;
            }

            $http(requestOptions)
                    .success(function (response) {
                        //hideLoading();
                        def.resolve(response);
                    })
                    .error(function (error) {
                        hideLoading();
                        alertErrorConnect('Не удалось подключиться к серверу, проверьте соединение с интернетом.');
                        def.reject(error);
                    });

            return def.promise;
        }

        function showIonicAlertPopup(params) {
            var alertPopup = $ionicPopup.alert({
                title: params.title,
                template: params.template,
                cssClass: (params.cssClass ? params.cssClass : ''),
                okText: (params.okText ? params.okText : 'OK')
            });
            alertPopup.then(function (res) {
                if (res) {
                    if (params.hideBack) {
                        $ionicHistory.nextViewOptions({
                            disableBack: true
                        });
                    }
                    if (params.state) {
                        $state.go(params.state);
                    }
                    if (params.stateClearCache) {
                        params.stateClearCache();
                    }

                } else {

                }
            });
            return true;
        }

        function showLoading() {
            $ionicLoading.show({
                template: "<ion-spinner class='spinner-positive'></ion-spinner>",
                animation: 'fade-in',
                hideOnStateChange: 'true'
            })
        }

        function hideLoading() {
            $ionicLoading.hide();
        }

        function showIonicConfirmPopup(params) {
            $ionicPopup.confirm({
                title: params.title,
                template: params.template,
                okText: params.okText,
                cancelText: params.cancelText
            }).then(function (res) {
                if (res) {
                    params.action();
                } else {

                }
            });
        }

        function showIonicShowPopup(params) {
            $ionicPopup.show({
                title: params.title,
                template: params.template,
                subTitle: params.subTitle,
                scope: params.scope,
                cssClass: (params.cssClass ? params.cssClass : ''),
                buttons: [
                    {text: params.cancelText},
                    {
                        text: params.okText,
                        type: 'button-positive',
                        onTap: function (e) {
                            params.action();
                        }
                    }
                ]
            });
        }

        function clearCachedView(stateIds) {
            return $ionicHistory.clearCache(stateIds);
        }

        function showToast(message, position, stick, time) {
            $ionicLoading.hide();
            ionicToast.show(message, position, stick, time);
        }

        function deviceRegistration() {
            //registration device token with $cordovaPushV5 plugin
            document.addEventListener("deviceready", function () {
                var isIOS = ionic.Platform.isIOS();
                var isAndroid = ionic.Platform.isAndroid();
                var isWindowsPhone = ionic.Platform.isWindowsPhone();
                var deviceInformation = ionic.Platform.device();

                var options = {
                    android: {
                        senderID: "287602559846",
                        icon: "icon"// 988668220653
                    },
                    ios: {
                        senderID: "287602559846", //      988668220653
                        alert: "true",
                        badge: "true",
                        sound: "true"
                    },
                    windows: {}
                };



                // initialize
                $cordovaPushV5.initialize(options).then(function (res) {

                    $cordovaPushV5.onNotification();
                    $cordovaPushV5.onError();

                    // register to get registrationId
                    $cordovaPushV5.register().then(function (result) {

                        var registrationOptions = {};

                        registrationOptions.deviceHash = deviceInformation.uuid;
                        registrationOptions.type = deviceInformation.model;
                        //check platform
                        if (isIOS) {
                            registrationOptions.deviceToken = result;
                            registrationOptions.os = 'ios';
                        }
                        if (isAndroid) {
                            registrationOptions.deviceToken = result;
                            registrationOptions.os = 'android';
                        }

                        var deviceToken = localStorageService.get('deviceToken');
                        var deviceOs = localStorageService.get('deviceOs');

                        if (!deviceToken || !deviceOs) {
                            registrationTokenProcess(registrationOptions);
                        }

                        if (deviceToken && deviceToken != registrationOptions.deviceToken) {
                            registrationTokenProcess(registrationOptions);
                        }

                        //device reg on server

                    }).catch(function (err) {
                        hideLoading();
                        alertErrorConnect
                    });
                }).catch(function (err) {
                    hideLoading();
                    alertErrorConnect
                });
            }, false);
        }

        function registrationTokenProcess(registrationOptions) {
            addDevice(registrationOptions).then(function (response) {
                if (response.status == 'OK') {
                    localStorageService.set('deviceToken', registrationOptions.deviceToken);
                    localStorageService.set('deviceOs', registrationOptions.os);
                }
            }, function (error) {
                hideLoading();
                alertErrorConnect
            });
        }

        function addDevice(registrationOptions) {
            var parameters = {
                url: 'api/device_register',
                data: registrationOptions,
                method: 'POST'
            };
            return httpRequest(parameters);
        }

        function deviceRemove(deviceHash) {
            var parameters = {
                url: 'api/remove_device',
                data: deviceHash,
                method: 'POST'
            };
            return httpRequest(parameters);
        }

        function getAllTexts(langPrefix) {
            var parameters = {
                url: 'api/get_all_texts',
                params: {langPrefix: langPrefix}
            };
            return httpRequest(parameters);
        }

        function refreshUserData() {
            var parameters = {
                url: 'api/refresh_user_data'
            };
            return httpRequest(parameters);
        }

        function getAllPlaceholders(langPrefix) {
            var parameters = {
                url: 'api/get_all_placeholders',
                params: {langPrefix: langPrefix}
            };
            return httpRequest(parameters);
        }

        function alertErrorConnect(errorText) {
            var alertPopup = $ionicPopup.alert({
                content: errorText,
                cssClass: "popups-custom"
            });
            alertPopup.then(function (res) {

            });

        }

        function getConfigs() {
            var parameters = {
                url: 'api/get_configs'
            };
            return httpRequest(parameters);
        }

        function needAuth() {
            localStorageService.remove('token');
            localStorageService.remove('user_info');
            localStorageService.remove('deviceToken');
            localStorageService.remove('deviceOs');
            $state.go('login');
        }


    }
})();