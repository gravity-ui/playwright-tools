export type YandexTeamUserData = {
    type: 'yandex-team';
    login: string;
    password: string;
};

export type PreprodKeyCloakUserData = {
    type: 'preprod-keycloak';
    login: string;
    password: string;
    federationId: string;
};

export type YandexUserData = {
    type: 'yandex';
    login: string;
    password: string;
    question?: string;
};

export type AzureAdUserData =
    | {
          type: 'azure-ad';
          email: string;
          password: string;
          federation: string;
          typeTwoFA: 'PUSH';
      }
    | {
          type: 'azure-ad';
          email: string;
          password: string;
          federation: string;
          typeTwoFA: 'OTP';
          otpSecretKey: string;
      };

export type CloudAuthWithOTPUserData = {
    type: 'cloud-otp';
    email: string;
    password: string;
    otpSecretKey: string;
};

export type UserData =
    | YandexTeamUserData
    | PreprodKeyCloakUserData
    | YandexUserData
    | AzureAdUserData
    | CloudAuthWithOTPUserData;

export type UserDataType = UserData['type'];
