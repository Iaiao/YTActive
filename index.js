const { google } = require("googleapis")
require("googleapis").youtube_v3.Resource$Comments

class UserCounter {

    /**
     * @param {string} api_key API key
     * @param {function(Comment): Promise<number> | number} evaluate comment evaluation function
     */
    constructor(api_key, evaluate) {
        this.client = google.youtube({
            version: "v3",
            auth: api_key
        })
        this.evaluate = evaluate
        this.subscribed = {}
    }

    /**
     * Counts all comments
     * @param {string} channel_id
     * @returns {Promise<Object>}
     */
    async count(channel_id) {
        const comments = await this.fetchComments(channel_id)
        let map = {}
        await Promise.all(comments.map(async comment => {
            if (map[comment.author_id] === undefined) map[comment.author_id] = 0
            map[comment.author_id] += await this.evaluate(comment)
        }))
        return map
    }

    /**
     * Fetches all comments from given channel
     * @param {string} channel_id
     * @returns {Promise<Array<Comment>>} comments
     */
    fetchComments(channel_id) {
        let pageToken = null
        return new Promise(async (resolve, reject) => {
            let comments = []
            do {
                let response = await this.client.commentThreads.list({
                    part: [ "snippet", "replies" ],
                    allThreadsRelatedToChannelId: channel_id,
                    maxResults: 100,
                    pageToken
                }).catch(err => reject(err))
                response.data.items.forEach(item => {
                    comments.push(new Comment(
                        item.snippet.topLevelComment.snippet.authorChannelId.value,
                        item.snippet.topLevelComment.snippet.textDisplay,
                        item.snippet.topLevelComment.snippet.likeCount ?? 0
                    ))
                    item.replies?.comments?.forEach(item => {
                        comments.push(new Comment(
                            item.snippet.authorChannelId.value,
                            item.snippet.textDisplay,
                            item.snippet.likeCount ?? 0
                        ))
                    })
                })
                pageToken = response.data.nextPageToken
            } while(pageToken != null)
            resolve(comments)
        })
    }

}

class Comment {
    /**
     * @param {string} author_id
     * @param {string} text
     * @param {number} like_count
     */
    constructor(author_id, text, like_count) {
        this.author_id = author_id
        this.text = text
        this.like_count = like_count
    }

    /**
     * Checks if the comment author has subscribed to `to_channel`
     * Only works if the user's subscriptions are public
     * @param {string} to_channel channel id
     * @param {UserCounter} counter the counter with a valid API token
     * @returns {Promise<boolean>} true = subscribed, false = not subscribed, rejects on users with private subscriptions
     */
    isSubscribed(to_channel, counter) {
        if(!counter.subscribed[to_channel]) counter.subscribed[to_channel] = {}
        return new Promise((resolve, reject) => {
            if(counter.subscribed[to_channel]?.[this.author_id] === undefined) {
                counter.client.subscriptions.list({
                    part: [ "id" ],
                    channelId: this.author_id,
                    forChannelId: to_channel,
                    maxResults: 1
                }).then(response => {
                    counter.subscribed[to_channel][this.author_id] = response.data.items.length > 0
                    resolve(counter.subscribed[to_channel][this.author_id])
                }).catch(err => reject(err))
            } else {
                resolve(counter.subscribed[to_channel][this.author_id])
            }
        })
    }
}

module.exports = UserCounter