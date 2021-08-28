import React from 'react';
import { View, Text, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import AsyncStorage from '@react-native-community/async-storage';
import NetInfo from '@react-native-community/netinfo';

const firebase = require('firebase');
require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCDfPPHqhJvYh3h0lEsrDQbPFx-NXe20Z4",
  authDomain: "chat-app-57708.firebaseapp.com",
  projectId: "chat-app-57708",
  storageBucket: "chat-app-57708.appspot.com",
  messagingSenderId: "601214280981",
  appId: "1:601214280981:web:6a8d055a3c73c93a0b351c",
  measurementId: "G-WS7G3QYFB5"
}

export default class Chat extends React.Component {
  constructor(props) {
    super(props);

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    this.referenceChatMessages = firebase.firestore().collection("messages");
    this.referenceMessageUser = null;

    this.state = {
      messages: [],
      uid: 0,
      user: {
        _id: "",
        name: "",
      },
      isConnected: false,
    };
  }

  async getMessages() {
    let messages = '';
    try {
      messages = await AsyncStorage.getItem('messages') || [];
      this.setState({
        messages: JSON.parse(messages)
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  componentDidMount() {
    const { name } = this.props.route.params;
    this.props.navigation.setOptions({ title: `${name}` });

    // Check if user is online or offline
    NetInfo.fetch().then(connection => {
      if (connection.isConnected) {
        this.setState({ isConnected: true });
        console.log('online');

        this.authUnsubscribe = firebase.auth().onAuthStateChanged((user) => {
          if (!user) {
            firebase.auth().signInAnonymously();
          }
          this.setState({
            uid: user.uid,
            messages: [],
            user: {
              _id: user.uid,
              name: name,
            }
          });
          this.unsubscribe = this.referenceChatMessages.orderBy("createdAt", "desc").onSnapshot(this.onCollectionUpdate);
          this.referenceMessagesUser = firebase.firestore().collection('messages').where("uid", "==", this.state.uid);
        });
      } else {
        console.log('offline');
        this.setState({ isConnected: false })
        // Calls messeages from offline storage
        this.getMessages();
      }
    });
  }

  componentWillUnmount() {
    if (this.state.isConnected == false) {
    } else {
      // stop online authentication
      this.authUnsubscribe();
      this.unsubscribe();
    }
  }

  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    // go through each document
    querySnapshot.forEach((doc) => {
      // get the QueryDocumentSnapshot's data
      let data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
        },
      });
    });
    this.setState({
      messages,
    });
  };

  async saveMessages() {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
    } catch (error) {
      console.log(error.message);
    }
  }

  onSend(messages = []) {
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }), () => {
      this.addMessages();
      this.saveMessages();
    });
  }

  addMessage() {
    const message = this.state.messages[0];
    // add the new messages to the collection
    this.referenceChatMessages.add({
      uid: this.state.uid,
      _id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      user: message.user,
    })
  };

  async deleteMessages() {
    try {
      await AsyncStorage.removeItem('messages');
      this.setState({
        messages: []
      })
    } catch (error) {
      console.log(error.message);
    }
  }

  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#000'
          }
        }}
      />
    )
  };

  //If offline, dont render the input toolbar
  renderInputToolbar(props) {
    if (this.state.isConnected === false) {
    } else {
      return (
        <InputToolbar
          {...props}
        />
      );
    }
  }

  render() {
    return (
      <View
        style={{
          flex: 1,

          backgroundColor: this.props.route.params.backgroundColor,
        }}
      >
        <GiftedChat
          messages={this.state.messages}
          renderInputToolbar={this.renderInputToolbar.bind(this)}
          renderBubble={this.renderBubble}
          messages={this.state.messages}
          onSend={(messages) => this.onSend(messages)}
          user={this.state.user}
        />
        {Platform.OS === 'android' ? <KeyboardAvoidingView behavior="height" /> : null}
      </View>
    );
  }
}