
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import AppHeader from "@xr3ngine/client-core/src/socialmedia/components/Header";
import FeedMenu from "@xr3ngine/client-core/src/socialmedia/components/FeedMenu";
import AppFooter from "@xr3ngine/client-core/src/socialmedia/components/Footer";
import { selectCreatorsState } from "@xr3ngine/client-core/src/socialmedia/reducers/creator/selector";
// import {Stories} from '@xr3ngine/client-core/src/socialmedia/components/Stories';
import { selectAuthState } from "@xr3ngine/client-core/src/user/reducers/auth/selector";
import { User } from "@xr3ngine/common/src/interfaces/User";
import { doLoginAuto } from "@xr3ngine/client-core/src/user/reducers/auth/service";
import { createCreator } from "@xr3ngine/client-core/src/socialmedia/reducers/creator/service";

import CreatorPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/CreatorPopup";
import FeedPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/FeedPopup";
import CreatorFormPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/CreatorFormPopup";
import ArMediaPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/ArMediaPopup";
import FeedFormPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/FeedFormPopup";
import SharedFormPopup from "@xr3ngine/client-core/src/socialmedia/components/popups/SharedFormPopup";

// @ts-ignore
import styles from './index.module.scss';
        
const mapStateToProps = (state: any): any => {
  return {
    auth: selectAuthState(state),
    // creatorsState: selectCreatorsState(state),   
  };
};

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  doLoginAuto: bindActionCreators(doLoginAuto, dispatch),
  createCreator: bindActionCreators(createCreator, dispatch),
});

const  Home = ({ createCreator,  doLoginAuto, auth }) => {
  /*hided for now*/
  useEffect(()=>{
    if(auth){
      // const user = auth.get('authUser')?.identityProvider.type === 'guest' ? auth.get('user') as User : auth.get('authUser')?.identityProvider as User;
      //   const userId = user ? user.id : null;
      //   if(userId){}
          createCreator();
             
    }
  },[auth]);

  useEffect(() => doLoginAuto(true), []); 

  return (<>
    <div className={styles.viewport}>
        <AppHeader logo="/assets/logoBlack.png" />
        {/* <Stories stories={stories} /> */}
        <FeedMenu />
        <AppFooter />
        <CreatorPopup />
        <FeedPopup />
        <CreatorFormPopup />
        <ArMediaPopup />
        <FeedFormPopup />
        <SharedFormPopup />
    </div>
  </>
  );
};

export default connect(mapStateToProps,mapDispatchToProps)(Home);
