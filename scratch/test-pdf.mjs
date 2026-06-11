import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import fs from "fs";

// Register Noto Sans Devanagari font
Font.register({
  family: "NotoSansDevanagari",
  fonts: [
    { src: "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf", fontWeight: 400 },
    { src: "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "NotoSansDevanagari",
  },
  text: {
    fontSize: 12,
    marginBottom: 10,
  }
});

const testCases = [
  { name: "Devanagari basic", text: "श्री गणेशाय नमः" },
  { name: "Devanagari with danda", text: "दूध का हिसाब ।" },
  { name: "Danda/pipe", text: "|| श्री ||" },
  { name: "Middle dot", text: "morning · evening" },
  { name: "Arrow", text: "01/05/2026 → 01/06/2026" },
  { name: "Em dash", text: "Address: —" },
  { name: "Rupees symbol", text: "₹ 50.00" },
  { name: "Devanagari Rupees", text: "रु 50.00" },
  { name: "Slash and percent", text: "Ph: 9285169170 @ 10%" }
];

async function runTests() {
  for (const tc of testCases) {
    console.log(`Testing: ${tc.name} (${tc.text})...`);
    try {
      const doc = React.createElement(
        Document,
        {},
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          React.createElement(Text, { style: styles.text }, tc.text)
        )
      );
      await renderToBuffer(doc);
      console.log(`  PASSED`);
    } catch (err) {
      console.error(`  FAILED:`, err.message);
    }
  }
}

runTests();
