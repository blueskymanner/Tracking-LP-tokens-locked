import React from "react";

function Header() {
    return (
        <div className="header">
            <div className="navbar">
                <div className="leftbar">
                    <a href="#" className="active left" > <img src="/assets/images/Lock.png" alt='' height="30" width="30" /> </a> 
                    <a href="#" className="logo left"> <b> Track Locker </b> </a> 
                </div>
                <div className="rightbar">
                    <a href="#" className="right"> <img src="/assets/images/medium.svg" alt='' height="20" width="20" /> </a> 
                    <a href="#" className="right"> <img src="/assets/images/twitter.svg" alt='' height="20" width="20" /> </a>
                    <a href="#" className="right"> <img src="/assets/images/telegram.svg" alt='' height="20" width="20" /> </a>
                </div>
            </div>
        </div>
    );
}

export default Header;