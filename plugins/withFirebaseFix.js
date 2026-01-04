const { withPodfile } = require('expo/config-plugins');

const withFirebaseFix = (config) => {
    return withPodfile(config, (config) => {
        let podfileContent = config.modResults.contents;

        // $RNFirebaseAsStaticFramework を設定
        if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
            const headerConfig = `# Firebase Configuration
$RNFirebaseAsStaticFramework = true

`;
            podfileContent = headerConfig + podfileContent;
        }

        config.modResults.contents = podfileContent;
        return config;
    });
};

module.exports = withFirebaseFix;
