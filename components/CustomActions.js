import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Permissions from 'expo-permissions'; // depricated but seems to still work
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const firebase = require('firebase');
require('firebase/firestore');


export default class CustomActions extends React.Component {

  // Select an image from image library
  imagePicker = async () => {
    // Expo asking for permission
    const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
    try {
      if (status === "granted") {
        // pick image
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // select only images
        }).catch((error) => console.log(error));
        //If the process is cancelled
        if (!result.cancelled) {
          const imageUrl = await this.uploadImageFetch(result.uri);
          this.props.onSend({ image: imageUrl });
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  // Take a new photo with the camera
  takePhoto = async () => {
    // Expo asking for permission
   const { status } = await Permissions.askAsync(
     Permissions.CAMERA,
     Permissions.MEDIA_LIBRARY
   );
   try {
     if (status === "granted") {
       const result = await ImagePicker.launchCameraAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
       }).catch((error) => console.log(error));

       if (!result.cancelled) {
         const imageUrl = await this.uploadImageFetch(result.uri);
         this.props.onSend({ image: imageUrl });
       }
     }
   } catch (error) {
     console.log(error.message);
   }
 };

//Get Location for location sharing
getLocation = async () => {
    try {
       // Expo asking for permission
      const { status } = await Permissions.askAsync(Permissions.LOCATION);
      if (status === "granted") {
        const result = await Location.getCurrentPositionAsync(
          {}
        ).catch((error) => console.log(error));
        const longitude = JSON.stringify(result.coords.longitude);
        const altitude = JSON.stringify(result.coords.latitude);
        if (result) {
          this.props.onSend({
            location: {
              longitude: result.coords.longitude,
              latitude: result.coords.latitude,
            },
          });
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  };

// Upload images to firebase
uploadImageFetch = async (uri) => {
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.log(e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  const imageNameBefore = uri.split("/");
  const imageName = imageNameBefore[imageNameBefore.length - 1];

  const ref = firebase.storage().ref().child(`images/${imageName}`);

  const snapshot = await ref.put(blob);

  blob.close();

  return await snapshot.ref.getDownloadURL();
};

onActionPress = () => {
    const options = [
      "Choose From Library",
      "Take Picture",
      "Send Location",
      "Cancel",
    ];
    const cancelButtonIndex = options.length - 1;
    this.context.actionSheet().showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (buttonIndex) => {
        switch (buttonIndex) {
          case 0:
            console.log("user wants to pick an image");
            return this.imagePicker();
          case 1:
            console.log("user wants to take a photo");
            return this.takePhoto();
          case 2:
            console.log("user wants to get their location");
            return this.getLocation();
        }
      }
    );
  };
  
  render() {
    return (
      <TouchableOpacity 
        accessible={true}
        accessibilityLabel="More options"
        accessibilityHint="Let’s you choose to send an image, take a new picture or send your location."
        style={[styles.container]} 
        onPress={this.onActionPress}>
          <View style={[styles.wrapper, this.props.wrapperStyle]}>
            <Text style={[styles.iconText, this.props.iconTextStyle]}>+</Text>
          </View>
      </TouchableOpacity>
    )
  }
}

// StyleSheet Start
const styles = StyleSheet.create({
  container: {
    width: 26,
    height: 26,
    marginLeft: 10,
    marginBottom: 10,
  },
  wrapper: {
    borderRadius: 13,
    borderColor: '#b2b2b2',
    borderWidth: 2,
    flex: 1,
  },
  iconText: {
    color: '#b2b2b2',
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
 });

 CustomActions.contextTypes = {
  actionSheet: PropTypes.func,
 };