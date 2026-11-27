import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';

// @ts-ignore federated module, resolved by @module-federation/metro
const Info = React.lazy(() => import('mini/info'));

export default function App(): React.JSX.Element {
  const [greeting, setGreeting] = useState<string>();

  useEffect(() => {
    // @ts-ignore federated module, resolved by @module-federation/metro
    import('mini/utils').then(utils => setGreeting(utils.greet('host')));
  }, []);

  return (
    <View>
      <Text>MF_FIXTURE_HOST_APP</Text>
      <Text>{greeting}</Text>
      <React.Suspense fallback={<Text>loading</Text>}>
        <Info label="host" />
      </React.Suspense>
    </View>
  );
}
