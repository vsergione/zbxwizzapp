#ZbxWizz

The ZbxWizz lets you easily import data from Zabbix or CSV into a table view, augment the data with subsequent queries to the API, apply simple or complex transformations using JavaScript and finally push the changes back to Zabbix throught the API, or just export them in CSV or JSON for further processing. 

Installation
---
ZbxWizz is distributed as a binary for Linux, Windows and Mac. 

Alternatively, you can clone the repository and using your favorite web browser open the file static/index.html. In this situation, certain problems might arrise:
- for certain Zabbix installations, HTTP2 should be disabled in the browser
- you must install a browser extension to disable CORSQuick start
---
Open ZbxWizz and provide the Zabbix API URL and token by clicking on the top right red Zabbix icon. Get a new API token in Zabbix web interface by navigating to Users -> API Tokens. The typical API URL is http://host/instalation_path/api_jsonrpc.php (eg. https://some.host.tld/zabbix/api_jsonrpc.php). Feel free to check the [Zabbix documentation](https://www.zabbix.com/documentation/current/en/manual/api) for more details. If the details are correct you will notice that the Zabbix icon turn from pale red to bright red.

### Import some hosts from Zabbix
Perform your first import from Zabbix by importing some hosts into the tool clicking on the top menu Import data -> Import from Zabbix.
In the newly opened modal window do the following:
- in the resource field make sure host is selected
- in the request editor paste the following code: `{"limit":5,"selectTags":["tag","value"]}`
- click on the green Import button

This will query the Zabbix API and it will return the first 10 hosts with their assigned tags, if any. 

### Perform some transformations
Let's add a new tag to all these hosts. In column 1 (proxyid), click on the **transform** text field in the table header and input the following code `json(obj(data.csv.tags).concat({"tag":"zbxwizz","value":"was here"}))`. You will notice already that a preview of the transformation for the first row in the table is being rendered right bellow the text box. If you are satisfied with the result click on the Apply. Now you have obtained for all the hosts in the table a new set of tags. 

### Update the hosts in Zabbix
Now that you generated the new set of tags for the hosts let's update Zabbix as well.
Fist you need to select the host which you want to update by clicking on the checkbox at the beggining of each row or by clicking on the checkbox next to Del Sel button in the table header. Doing so will toggle the selection all visible rows.

In the top menu bar go to Zabbix ops -> Push. In the newly opened modal do the following
1. in the Resource select host
2. in the Operation select update
3. in the request editor paste the following code: `{
        "hostid":"${flds.hostid}",
        "tags":${cols[1]}
    }`
4. inspect the preview box bellow the request editor and make sure that you see the hostId and the newly generated set of tags. It should look something like:
`{ "hostid":"10599", "tags":[{"tag":"TG","value":"1"},{"tag":"NH","value":"2"},{"tag":"zbxwizz","value":"was here"}]}`

    Notice that inside the request I have used 2 variabiles:
        - ${flds.hostid} - this format is accesing the row cells by using the field name (see header row), 
        - 


5. click on the red Push button and also on the Confirm button in the next confirmation dialog.


That's it!! Go now to Zabbix and check that the changes have been implemented.

### Final notes
A different approach of the above workflow, especially if you have no idea about JavaScript, but you are an Excel god, would be after the 1st step to export the data in CSV, open it with Excel and do the processing there, import the data back by using the Import from CSV and finally push the data in zabbix as is shown in the lastest step. Make sure that the name of the column holding the host ID is **hostid**, otherwise update the request (flds.hostid part) to match the column name (eg. flds.HOST_ID). Same for the column holding the data that you want to udpate 

User manual
---
Being a GUI app, I've done my best to compile this minimal user manual to help you move around the app. Using at







