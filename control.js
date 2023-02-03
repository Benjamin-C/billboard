
function formReset(event) {
    let sk = document.getElementById("secret").value
    document.getElementById("myForm").reset();
    document.getElementById("secret").value = sk;
    event.preventDefault()
}

let commandURL = location.href;
commandURL = commandURL.substring(0, commandURL.lastIndexOf("/")) + "/command";

function updatePresetList() {
    // const select = document.querySelector('select'); 
    let queryData = {
        secret: document.getElementById("secret").value,
        mode: "getpresets"
    }
    $.ajax({
        url: commandURL,
        type: 'post',
        data: queryData,
        success: function(data){
            console.log(data);
            const select = document.querySelector('preset');
            let selected =  $('#preset :selected').text();
            $("#preset").empty();
            console.log($('#preset').val)
            data.forEach((name) => {
                $('#preset').append("<option value=\"" + name + "\">" + name + "</option>");
                if(name == selected) {
                    $("#preset").val(name);
                }
                console.log(name);
            });
        }
    });
}

function requestReload() {
    reloadData = {
        secret: document.getElementById("secret").value,
        reload: "true"
    }
    $.ajax({
        url: commandURL,
        type: 'post',
        data: reloadData,
        success: function(text){
            if(text == "Secret changed") {
                console.log("Updated")
                document.getElementById("myForm").reset();
            }
            console.log(text);
            alert(text);
        }
    });
}
function formSubmit(event) {
    $.ajax({
        url: commandURL,
        type: 'post',
        data: $('#myForm').serialize(),
        success: function(text){
            alert(text);
        }
    });
    event.preventDefault();
}

function attachFormSubmitEvent(formId) {
    document.getElementById(formId).addEventListener("submit", formSubmit);
    document.getElementById(formId).addEventListener("reset", formReset);
    $(formId).keydown(function(event) {
        if (event.ctrlKey && event.keyCode === 13) {
            $(this).trigger('submit');
        }
    })
}

function myFunction(field) {
    var x = document.getElementById(field);
    if (x.type === "password") {
      x.type = "text";
    } else {
      x.type = "password";
    }
  } 

function setVisible(id, visible) {
    var x = document.getElementById(id);
    if(visible) {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
} 

function setMode(button) {
    let visible = button.split(" ");
    hidableEmements.split(" ").forEach(element => {
        setVisible(element + "_tt", visible.includes(element));
    })
}