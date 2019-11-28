module.exports = {
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2018,
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        }
    },
    "env": {
        "node": true,
        "jest/globals": true,
        "es6": true,
    },
    "extends": ["eslint:recommended", "plugin:jest/recommended", "plugin:react/recommended"],
    "plugins": ["jest"],
    "rules": {
        // enable additional rules
        "indent": ["error", 4],
        "linebreak-style": ["error", "unix"],
        "semi": ["error", "always"],
        "quotes": ["error", "backtick"],
        "prefer-template": ["error"],
        "template-curly-spacing": ["error", "never"],
        "quote-props": ["error", "consistent-as-needed"],

        // override default options for rules from base configurations
        "comma-dangle": ["error", "only-multiline"],
        "no-cond-assign": ["error", "always"],

        // disable rules from base configurations
        "no-console": "warn",

        "no-unused-vars": "warn",

        // jest rules
        "jest/no-disabled-tests": "warn",
        "jest/no-focused-tests": "error",
        "jest/no-identical-title": "error",
        "jest/prefer-to-have-length": "warn",
        "jest/valid-expect": "error",

        "eol-last": ["error", "always"],
    }
};