module.exports = {
    async getInsights({ homey, params, query, body }) {
        await homey.app.getInsights(query.search, (err, result) => {
            return {
                success: err == null,
                error: err,
                result: result
            };
        });
    },
    async getTrends({ homey, params, query, body }) {
        await homey.app.getTrends(query.id, query.uid, query.minutes, query.scopeUnit, (err, result) => {
            return {
                success: err == null,
                error: err,
                result: result
            };
        });
    },
};