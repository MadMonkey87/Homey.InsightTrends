const Homey = require('homey')

module.exports = [
    {
        method: 'GET',
        path: '/insights',
        public: false,
        fn: async function (args, callback) {
            await Homey.app.getInsights(args.query.search, (err, result) => {
                if (err) {
                    callback(err, null)
                } else {
                    callback(null, result)
                }
            })
        }
    },
    {
        method: 'GET',
        path: '/trends',
        public: false,
        fn: async function (args, callback) {
            await Homey.app.getTrends(args.query.id, args.query.uid, args.query.scope, args.query.scopeUnit, (err, result) => {
                if (err) {
                    callback(err, null)
                } else {
                    callback(null, result)
                }
            })
        }
    }
]