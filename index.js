const { google } = require("googleapis")
require("googleapis").youtube_v3.Resource$Comments

class UserCounter {

    /**
     * @param {string} api_key API key
     * @param {function(Comment): Number} evaluate comment evaluation function
     */
    constructor(api_key, evaluate) {
        this.client = google.youtube({
            version: "v3",
            auth: api_key
        })
        this.evaluate = evaluate
    }

    /**
     * Counts all comments
     * @param {string} channel_id
     * @returns {import(Promise<Object>}
     */
    count(channel_id) {
        return this.fetchComments(channel_id)
            .then(comments => {
                let map = {}
                comments.forEach(comment => {
                    if(map[comment.author_id] === undefined) map[comment.author_id] = 0
                    map[comment.author_id] += this.evaluate(comment)
                })
                return map
            })
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
     * @param {Number} like_count
     */
    constructor(author_id, text, like_count) {
        this.author_id = author_id
        this.text = text
        this.like_count = like_count
    }
}

module.exports = UserCounter