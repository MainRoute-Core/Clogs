# Clogs

**Clogs** is the blog system powering the MainRoute Core Blog:

[https://MainRoute-Core.github.io/Clog/](https://MainRoute-Core.github.io/Clog/)

---

## Components

### Clog Builder

[Build](https://mainroute-core.github.io/Clogs/Builder/)

### Clog Reader

## [Build](https://mainroute-core.github.io/Clogs/Reader/)

## Database Structure

### Blog Database

`blogs.json`

Contains metadata and indexes for all blog posts.

### Blog Content Storage

Stores all individual blog post files.

---

## URL Parameters

The reader supports URL-based state synchronization.

### Search Query

```text
?q=<search term>
```

Example:

```text
?q=javascript
```

### Tag Filter

```text
&tg=<tag>
```

Example:

```text
&tg=tutorial
```

### Category Filter

```text
&ct=<category>
```

Supports multiple category selection:

```text
&ct=technology,web-development,opensource
```

### Open Blog Post

```text
&log=<blog_id>
```

Example:

```text
&log=post-001
```

### Post Not Found

```text
&log=404
```

Displayed when the requested post does not exist.

---

## Example URL

```text
https://MainRoute-Core.github.io/blog/?q=markdown&tg=tutorial&ct=web-development,opensource&log=post-001
```
