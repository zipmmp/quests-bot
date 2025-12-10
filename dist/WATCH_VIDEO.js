const moment = require('moment-timezone');
const { QuestConfig } = require('../lib/questConfig.js');
const ms = require('ms');
module.exports = new QuestConfig({
    name: "WATCH_VIDEO",
    async run(user) {
        const taskName = "WATCH_VIDEO";
        const secondsNeeded = user.target;
        let progress = user.current || 0;
        const startDate = moment().unix() - progress;
        while (!user.stoped) {
            const heartbeat = await user.api
                .post(`/quests/${user.quest}/video-progress`, {
                timestamp: moment().unix() - startDate,
            })
                .catch((err) => err.response);
            if (!heartbeat?.data?.user_id) {
                user.stop("Error sending heartbeat");
                break;
            }
            // now you can use this.extractProgress or any method of QuestConfig
            const response = user.extractProgress(heartbeat?.data);
            user.sendUpdate(progress, response?.completed === true);
            progress = response.value;
            user.sendUpdate(progress, response?.completed === true);
            if (progress >= secondsNeeded ||
                response?.completed === true) {
                user.stop();
                user.completed = true;
                break;
            }
            await user.delay(ms("5s"));
        }
    },
});
