import GObject from "gi://GObject";
import Adw from "gi://Adw";
import GLib from "gi://GLib";

import { ArtistAlbums, get_artist_albums } from "src/muse.js";

import { EndpointContext, MuzikaComponent } from "src/navigation.js";
import { CarouselGridView } from "src/components/carousel";
import { PlayableContainer } from "src/util/playablelist";
import { MixedCardItem } from "src/components/library/mixedcard";

interface ArtistAlbumsState {
  contents: ArtistAlbums;
}

CarouselGridView;

export class ArtistAlbumsPage extends Adw.Bin
  implements MuzikaComponent<ArtistAlbums, ArtistAlbumsState> {
  static {
    GObject.registerClass({
      GTypeName: "ArtistAlbumsPage",
      Template: "resource:///com/vixalien/muzika/ui/pages/artist-albums.ui",
      InternalChildren: ["view"],
    }, this);
  }

  private _view!: CarouselGridView;

  constructor() {
    super();

    this._view.connect("activate", (_, position) => {
      const container = this._view.items.get_item(position);

      this.activate_cb(container?.object ?? null);
    });
  }

  // you never know if it's only an Album or any other MixedCardItem
  activate_cb(item: MixedCardItem | null) {
    if (!item) return;

    let uri: string | null = null;

    switch (item.type) {
      case "playlist":
      case "watch-playlist":
        uri = `playlist:${item.playlistId}`;
        break;
      case "artist":
        uri = `artist:${item.browseId}`;
        break;
      case "album":
        uri = `album:${item.browseId}`;
        break;
      case "inline-video":
      case "song":
      case "video":
      case "flat-song":
        if (item.videoId) {
          this.activate_action(
            "queue.play-song",
            GLib.Variant.new_string(
              item.videoId,
            ),
          );
        }
        break;
    }

    if (uri) {
      this.activate_action(
        "navigator.visit",
        GLib.Variant.new_string("muzika:" + uri),
      );
    }
  }

  results?: ArtistAlbums;

  present(results: ArtistAlbums) {
    this.results = results;

    this.show_artist_albums(results);
  }

  get_state() {
    return {
      contents: this.results!,
    };
  }

  restore_state(state: ArtistAlbumsState): void {
    this.show_artist_albums(state.contents);
  }

  private show_artist_albums(content: ArtistAlbums) {
    this._view.items.splice(
      0,
      0,
      content.results
        .filter((item) => item != null)
        .map(PlayableContainer.new_from_mixed_card_item),
    );
  }

  static async load(context: EndpointContext) {
    const results = await get_artist_albums(
      context.match.params.channelId,
      context.match.params.params,
      {
        signal: context.signal,
      },
    );

    context.set_title(`${results.artist} - ${results.title}`);

    return results;
  }
}
