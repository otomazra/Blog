console.log("Script working correctly");
let textArray = document.getElementsByClassName("post-body");
// console.log(textArray);
let realArray = Array.from(textArray);
// console.log(realArray);

realArray.forEach(text=>{
    console.log(text.innerHTML);
    console.log(text.textContent);
    if (text.textContent.length>100){
       text.innerHTML = text.textContent.slice(0, 100) +"...";
    }else{
        text.textContent;
    }
});