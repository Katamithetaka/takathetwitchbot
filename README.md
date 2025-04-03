# Taka the twitch bot

To run this code you must:

- Login to https://dev.twitch.tv/
- Create a new application on https://dev.twitch.tv/console/apps
  ![image](https://github.com/user-attachments/assets/04555f7a-aeff-459a-b1a3-0784afb3b865)
- Authorize your account with a url that looks like:
- https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=<<<YOUR_CLIENT_ID>>>&redirect_uri=<<<YOUR_REDIRECT_URI>>>&scope=channel:read:redemptions%20user:read:chat&state=<<<YOUR_CUSTOM_STATE>>>
- Enter all the required info in a private_config.ts file based on the private_config.example.ts file.
- Some of the informations you should be getting from the api, notably the redeem id's you can get by logging the event data
![image](https://github.com/user-attachments/assets/e8466605-8b50-4535-bf3d-fa7fd3377aaa)


Finally, run
```bash 
deno run twitch_bot_example.ts
```


That's it! now you should be able to run the bot.
