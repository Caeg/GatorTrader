/**
 * @description This API allows the front end to communicate with the backend through simple functions.
 * @author Jack Cole jcole2@mail.sfsu.edu
 */
class GatorTraderAPI {

    /**
     * @description Grabs a list of posts from the database
     * @param name {string} The title of a post. Will do a partial match
     * @param category {String} The category ID. Set to 0 if looking through all categories
     * @param page {String} The page number. Starts at 1.
     * @param sort {String} The sorting method
     * @param callback {function} The function to be called after results are found
     * @author Jack Cole jcole2@mail.sfsu.edu
     */
    static searchPosts(name, category, page, sort, callback){
        if(category.length === 0) category = "0"
        if(page.length === 0) page = "1"
        if(sort.length === 0) sort = "default"
        let params = $.param({name:name, category:category, page:page, sort:sort})
        let url = '/api/post/search?'+params
        return $.get(url,callback)
    }

    /**
     * @description Grabs a list of recent posts
     * @param callback {function} The function to be called after results are found
     * @author Jack Cole jcole2@mail.sfsu.edu
     */
    static getRecentPosts(callback){
        let url = 'api/post/recent'
        return $.get(url,callback)
    }

    /**
     * @description Gets the Post Details based on ID
     * @param id
     * @param callback {function} The function to be called after results are found
     * @author Ryan Jin
     */
    static getPostDetails(id, callback){
        let params = $.param({id:id})
        let url = '/api/post/'+params
        return $.get(url,callback)
    }

    /**
     * @description Gets the Post Details based on ID
     * @param id
     * @param callback {function} The function to be called after results are found
     * @author Ryan Jin
     */
    static getAllPostsByCategory(category_id, callback){
        let params = $.params({category_id:category_id})
        let url ='api/category/'+params
        return $.get(url,callback)
}