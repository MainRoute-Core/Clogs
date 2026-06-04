# blog

MainRoute Core Blog Use by https://MainRoute-Core.github.io/blog/ And https://mramzanch.blogspot.com

---

This My Clog Builder That Make json Which Contain Markdown of Post Content

Now I need to Make It More Improved and Boosted

1. Make I(s Full Responssiveness for mobile and desktop
2. Use Side panel for Settings and Configs
3. Use this configs instead of current
   - GitHub Personal Token
   - GitHub Owner / Username
   - GitHub Repo Name
   - Target Branch
   - File Target Path/Folder ('/' to sub & auto fill current name of file by id)
   - ImgBB API Key (Optional)

4. Use Drop for Meta Inputs
5. keep everthing same
6. Use Inline svg like this
   all svg in a main svgs
   `<svg><symbol id="id of icon"></symbol></svg>`
   use as this as
   `<svg><use href="# icon id"></svg>`
7. balsoo add download option to downloadv file

> Not give me code yet now only explain

---

This My Clog Now Update this to our Ui and Tech look

instead of using define configs seperatly need use two paths

db.json(Blogs Database) DB_Path

https://raw.githubusercontent.com/<file name.json> to fetch from repo or "local path<file name.json> " to fetch from local

all Blogs paths Logs_Path 2. https://raw.githubusercontent.com/<file name.json> to fetch from repo or "local path<file name.json> " to fetch from local

use these parameter for url syncing

`?q=` for search queries
`&tg=` for tags
`&ct=` for categories + multi category slection support
`&log=<blod id>` for opened post
`&log=404` for post not find

show clear filter button when filter posts to clear filter
when user click only on post card banner image/title then open post
also click tags that shown in post card to filter
show all categories badges on crads
fetch 404.html page when show error for post not found
full mobile and desktop respossiveness
