# YTActive
Find your most active YouTube subscribers

This tool is created for youtubers (or analysts) who want to find out their most active and famous commenters.
The concept of this thing is points. You will create your own comment evaluator like `if comment contains "I like it" give +5 points, +1 point per word, +2 points per comment like, multiply everything by 2 if the user is subscribed`.

## Usage
```js
const UserCounter = require("ytactive")

let counter = new UserCounter(process.env.YTA_TOKEN, comment => new Promise((resolve, _reject) => {
    let n = comment.text.split(" ").length * 1 + comment.like_count * 2
    comment.isSubscribed("your_channel_id", a).then(subscribed => {
        resolve(n * (subscribed ? 2 : 1))
    }).catch(_ => resolve(n))
}))
counter.count("your_channel_id").then(comments => {
    // { "commenter_channel_id": <points> }.
    // Let's sort it so we will see the most active commenters.
    let entries = Object.entries(comments)
    entries.sort(function(a, b) {
        return b[1] - a[1];
    })
    console.log(entries)
})
```