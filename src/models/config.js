
class Config {
    #defaultStravaClientId = 0;
    #defaultIntervalsClientId = 0;
    #defaultTrainingPeaksClientId = 0;

    constructor() {
        this.env = {
            // PWA_URI: "https://localhost:1234", // dev
            // API_URI: "https://localhost:8080", // dev
            // TURNSTILE_SITE_KEY: '1x00000000000000000000AA', // dev
            PWA_URI: window.location.origin ?? "https://auuki.com", // live
            API_URI: "https://api.auuki.com", // live
            TURNSTILE_SITE_KEY: '0x4AAAAAAA2IUz1CU0EU3E-O', // live
            // custom build: accounts, Intervals.icu, Strava and TrainingPeaks
            // need the api.auuki.com backend, which a copy on another domain
            // can't use. false hides them and skips every call to the API.
            HOSTED_API: false,
            STRAVA_CLIENT_ID: this.defaultStravaClientId,
            INTERVALS_CLIENT_ID: this.defaultIntervalsClientId,
            TRAINING_PEAKS_CLIENT_ID: this.defaultTrainingPeaksClientId,
        };
    }
    setServices(args = {}) {
        this.env.STRAVA_CLIENT_ID = args.strava ?? this.defaultStravaClientId;
        this.env.INTERVALS_CLIENT_ID = args.intervals ?? this.defaultIntervalsClientId;
        this.env.TRAINING_PEAKS_CLIENT_ID = args.trainingPeaks ?? this.defaultTrainingPeaksClientId;
    }
    get() {
        return this.env;
    }
}

const config = new Config();

export default config;
