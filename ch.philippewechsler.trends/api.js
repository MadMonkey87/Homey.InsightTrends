module.exports = {
    async getInsights({ homey, params, query, body }) {
        return await homey.app.getInsights(query.search);
    },
    async getTrends({ homey, params, query, body }) {
        return await homey.app.getTrends(query.id, query.uid, query.minutes, query.scopeUnit);
    },
};